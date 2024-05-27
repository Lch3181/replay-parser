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
        let playerData = null;
        let items = [];

        parser.on("basic_replay_information", (info) => {
            const filename = info.metadata.map.mapName;
            const extractedVersion = extractVersion(filename);
            const comparisonVersion = "0.63c"; // patch that with chest loot

            if (extractedVersion) {
                if (compareVersions(extractedVersion, comparisonVersion) >= 0) {
                    //console.log('The version is greater than or equal to v0.63c');
                } else {
                    throw new Error('The version is less than v0.63c');
                }
            } else {
                throw new Error('No version found in the filename');
            }

            playerData = info.metadata.playerRecords;
        });

        parser.on("gamedatablock", (block) => {
            if (block.commandBlocks && Array.isArray(block.commandBlocks) && block.commandBlocks.length === 0) {
                return;
            }

            if (block.id === 0x1f) {
                block.commandBlocks.forEach(commandBlock => {
                    commandBlock.actions.forEach(action => {
                        if (action.id === 16 && action.abilityFlags === 64 && !containsNonNumberOrAlphabet(action.itemId)) {
                            const newItem = {
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
                const playerName = getPlayerNameById(playerData, item.playerId);
                if (username != "" && !playerName.toLowerCase().includes(username)) {
                    return null
                }
                const itemName = getItemNameById(item.itemId);
                return `${playerName}: ${itemName}`;
            } catch (error) {
                return null; // or handle the error in some other way
            }
        }).filter(entry => entry !== null);

        return result
    } catch (error) {
        throw error;
    }
}

function containsNonNumberOrAlphabet(asciiArray) {
    return asciiArray.some(charCode => {
        const char = String.fromCharCode(charCode);
        // Check if the character is not a number (0-9) or alphabet (A-Z, a-z)
        return !/^[a-zA-Z0-9]$/.test(char);
    });
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
    console.log(`Server is running on port ${port}`);
});