const fs = require('fs');
const ReplayParser = require("w3gjs/dist/lib/parsers/ReplayParser").default;

let itemData = null;

// Initialize item data
async function init() {
    const url = 'https://raw.githubusercontent.com/sfarmani/twrpg-info/master/items.json';
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        itemData = await response.json();
    } catch (error) {
        console.error('Error fetching or parsing item data:', error);
    }
}

async function parseW3G(filepath, username) {
    try {
        const buffer = fs.readFileSync(filepath);
        const parser = new ReplayParser();
        let time = 0; //ms
        let gameData = {};
        let playerData = null;
        let chat = [];
        let items = [];

        parser.on("basic_replay_information", (info) => {
            playerData = mapPlayerData(info.metadata.playerRecords, info.metadata.slotRecords)
            gameData = {
                version: info.subheader.version,
                length: msToReadableTime(info.subheader.replayLengthMS),
                map: info.metadata.map.mapName,
                host: info.metadata.map.creator,
                gameName: info.metadata.gameName
            };
        });

        parser.on("gamedatablock", (block) => {
            time += block.timeIncrement || 0;

            // user chat message
            if (block.id === 0x20) {
                const player = getPlayerById(playerData, block.playerId)
                const chatData = {
                    time: msToReadableTime(time),
                    player: player.playerName,
                    color: player.hex,
                    mode: getMessageType(block.mode),
                    message: block.message
                };
                chat.push(chatData)
            }

            // user action
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

        // optained loots from chest
        const loots = items.map((item) => {
            try {
                const gameTime = msToReadableTime(item.time)
                const playerName = getPlayerById(playerData, item.playerId).playerName;
                if (username != "" && !playerName.toLowerCase().includes(username)) {
                    return null;
                }

                const itemName = getItemNameById(item.itemId);
                return `${gameTime} ${playerName}: ${itemName}`;
            } catch (error) {
                return null; // or handle the error in some other way
            }
        }).filter(entry => entry !== null);

        // Remove duplicates using Set
        const uniqueloots = [...new Set(loots)];

        // result json
        const result = {
            gameData: gameData,
            chatData: chat,
            loots: uniqueloots
        };

        return result;
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

function getPlayerById(playerData, id) {
    if (!playerData) {
        throw new Error('Player data not initialized. Please call init() first.');
    }

    const player = playerData.find(player => player.playerId === id);
    if (!player) {
        throw new Error(`Player with id ${id} not found.`);
    }

    return player;
}

// Function to map player data with id, name, and color details
function mapPlayerData(playerRecords, slotRecords) {

    const colors = [
        { id: 0, name: 'Red', hex: 'FF0303', rgb: [255, 3, 3] },
        { id: 1, name: 'Blue', hex: '0042FF', rgb: [0, 66, 255] },
        { id: 2, name: 'Teal', hex: '1CB619', rgb: [28, 230, 185] },
        { id: 3, name: 'Purple', hex: '540081', rgb: [80, 0, 129] },
        { id: 4, name: 'Yellow', hex: 'FFFF01', rgb: [255, 255, 1] },
        { id: 5, name: 'Orange', hex: 'FE8A0E', rgb: [254, 138, 14] },
        { id: 6, name: 'Green', hex: '20C000', rgb: [32, 192, 0] },
        { id: 7, name: 'Pink', hex: 'E55BB0', rgb: [229, 91, 176] },
        { id: 8, name: 'Grey', hex: '959697', rgb: [149, 150, 151] },
        { id: 9, name: 'Light Blue', hex: '7EBFF1', rgb: [126, 191, 241] },
        { id: 10, name: 'Dark Green', hex: '106246', rgb: [16, 98, 70] },
        { id: 11, name: 'Brown', hex: '4E2A04', rgb: [74, 42, 4] }
    ];

    // Create a mapping of playerId to playerName
    const playerMap = {};
    playerRecords.forEach(record => {
        playerMap[record.playerId] = record.playerName;
    });

    // Create the final mapping of player data with id, name, and color details, only for players
    const playerData = slotRecords
        .filter(slot => slot.playerId !== 0)
        .map(slot => {
            const color = colors.find(c => c.id === slot.color);
            return {
                playerId: slot.playerId,
                playerName: playerMap[slot.playerId] || 'Unknown',
                colorId: color ? color.name : 'Unknown',
                hex: color ? color.hex : 'Unknown',
                rgb: color ? color.rgb : 'Unknown'
            };
        });

    return playerData;
}

function getMessageType(code) {
    switch (code) {
        case 0x00:
            return "All";
        case 0x01:
            return "Allies";
        case 0x02:
            return "Observers";
        default:
            return "Unknown";
    }
}

module.exports = {
    init,
    parseW3G
};