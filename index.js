const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ReplayParser = require("w3gjs/dist/lib/parsers/ReplayParser").default;

const app = express();
const port = 3000;

let itemData = null;

// Initialize item data on server start
async function init() {
    const url = 'https://raw.githubusercontent.com/sfarmani/twrpg-info/master/items.json';
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        itemData = await response.json();
        console.log('Item data initialized.');
    } catch (error) {
        console.error('Error fetching or parsing item data:', error);
    }
}

init();

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/parse-w3g', upload.single('file'), async (req, res) => {
    console.log('POST /parse-w3g');

    const username = req.body.username.toLowerCase() || "";

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const filePath = req.file.path;
        let items = await parseW3G(filePath, username);

        if (items.length !== 0) {
            res.send(items.join('\n'));
        } else {
            res.send("None");
        }
    } catch (error) {
        res.status(500).send(error.message);
    } finally {
        fs.unlinkSync(req.file.path); // Clean up the uploaded file
    }
});

async function parseW3G(filepath, username) {
    try {
        const buffer = fs.readFileSync(filepath);
        const parser = new ReplayParser();
        let time = 0; //ms
        let playerData = null;
        let items = [];

        parser.on("basic_replay_information", (info) => {
            playerData = info.metadata.playerRecords;
        });

        parser.on("gamedatablock", (block) => {
            time += block.timeIncrement || 0;

            if (block.commandBlocks && Array.isArray(block.commandBlocks) && block.commandBlocks.length === 0) {
                return;
            }

            if (block.id === 0x1f) {
                block.commandBlocks.forEach(commandBlock => {
                    commandBlock.actions.forEach(action => {
                        if (action.id === 16 && action.abilityFlags === 64 && isAlphabetOrDigit(action.itemId)) {
                            const newItem = {
                                time: time,
                                playerId: commandBlock.playerId,
                                itemId: convertToAscii(action.itemId)
                            };
                            items.push(newItem);
                        }
                    });
                });
            }
        });

        await parser.parse(buffer);

        const result = items.map((item) => {
            try {
                const gameTime = msToReadableTime(item.time)
                const playerName = getPlayerNameById(playerData, item.playerId);
                if (username != "" && !playerName.toLowerCase().includes(username)) {
                    return null
                }
                const itemName = getItemNameById(item.itemId);
                return `${gameTime} ${playerName}: ${itemName}`;
            } catch (error) {
                return null; // or handle the error in some other way
            }
        }).filter(entry => entry !== null);

        // Remove duplicates using Set
        const uniqueResult = [...new Set(result)];

        return uniqueResult
    } catch (error) {
        throw error;
    }
}

function isAlphabetOrDigit(asciiValues) {
    return asciiValues.every(value => (value >= 48 && value <= 122));
}

function msToReadableTime(milliseconds) {
    let remainingMs = milliseconds;

    const hours = Math.floor(remainingMs / 3600000);
    remainingMs %= 3600000;

    const minutes = Math.floor(remainingMs / 60000);
    remainingMs %= 60000;

    const seconds = Math.floor(remainingMs / 1000);
    const padWithZero = (num) => (num < 10 ? '0' + num : num);

    const formattedTime = `${padWithZero(hours)}:${padWithZero(minutes)}:${padWithZero(seconds)}`;
    return formattedTime;
}

function convertToAscii(array) {
    return array.map(num => String.fromCharCode(num)).reverse().join('');
}

function getItemNameById(id) {
    if (!itemData) {
        throw new Error('Item data not initialized. Please call init() first.');
    }

    const item = itemData.find(item => item.id === id);
    if (!item) {
        throw new Error(`Item with id ${id} not found.`);
    }

    return item.name;
}

function getPlayerNameById(playerData, id) {
    if (!playerData) {
        throw new Error('Player data not initialized. Please call init() first.');
    }

    const player = playerData.find(player => player.playerId === id);
    if (!player) {
        throw new Error(`Player with id ${id} not found.`);
    }

    return player.playerName;
}

function extractVersion(filename) {
    const regex = /v(\d+\.\d+[a-z]?)/i;
    const match = filename.match(regex);
    return match ? match[1] : null;
}

function compareVersions(version1, version2) {
    const parseVersion = (version) => {
        const regex = /(\d+)\.(\d+)([a-z]?)/i;
        const match = version.match(regex);
        return match ? {
            major: parseInt(match[1], 10),
            minor: parseInt(match[2], 10),
            suffix: match[3] || ''
        } : null;
    };

    const v1 = parseVersion(version1);
    const v2 = parseVersion(version2);

    if (!v1 || !v2) {
        throw new Error('Invalid version format');
    }

    if (v1.major !== v2.major) {
        return v1.major - v2.major;
    }

    if (v1.minor !== v2.minor) {
        return v1.minor - v2.minor;
    }

    return v1.suffix.localeCompare(v2.suffix);
}

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname)));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});