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
        console.log('Item data initialized.');
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
        let items = [];

        parser.on("basic_replay_information", (info) => {
            playerData = info.metadata.playerRecords;
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
                const playerName = getPlayerNameById(playerData, item.playerId);
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

module.exports = {
    init,
    parseW3G
};