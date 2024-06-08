document.getElementById('uploadForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const files = document.getElementById('fileInput').files;
    const username = document.getElementById('usernameInput').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous results
    document.body.style.cursor = 'wait';

    const uploadPromises = Array.from(files).map((file, index) => {
        const formData = new FormData();
        formData.append('file', file);

        return fetch('/parse-w3g', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                fetchUpload(index, file.name, data, username);
            })
            .catch(error => {
                row.body.innerText = 'Error: ' + error.message;
            });
    });

    // Wait for all upload promises to resolve
    await Promise.allSettled(uploadPromises);
    document.body.style.cursor = 'default';
});

function createRow(index, filename) {
    const resultsDiv = document.getElementById('results');

    // div
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-div';
    resultDiv.id = `result-${filename}`;
    resultDiv.dataset.index = index;
    resultDiv.style.order = index;

    // title
    const title = document.createElement('h3');
    title.innerText = filename;

    // body
    const body = document.createElement('p');
    body.innerText = 'Loading...';

    // hover panel
    const hoverPanel = document.createElement('div');
    hoverPanel.className = 'hover-panel';
    hoverPanel.innerHTML = "Loading...";

    // button to open chat history
    const chatButton = document.createElement('button');
    chatButton.disabled = true
    chatButton.id = `open-button-${filename}`
    chatButton.className = "open-button"
    chatButton.innerText = 'Chat History';
    chatButton.addEventListener('click', () => {
        // Hide all chat-popups
        const chatPopups = document.querySelectorAll('[id^="chat-popup-"]');
        chatPopups.forEach(popup => {
            popup.style.display = 'none';
        });

        document.getElementById(`chat-popup-${filename}`).style.display = 'block';
    });

    resultDiv.appendChild(chatButton);
    resultDiv.appendChild(title);
    resultDiv.appendChild(body);
    resultDiv.appendChild(hoverPanel);

    // hover panel events
    resultDiv.addEventListener('mouseenter', () => {
        hoverPanel.style.display = 'block';
    });

    resultDiv.addEventListener('mouseleave', () => {
        hoverPanel.style.display = 'none';
    });

    resultDiv.addEventListener('mousemove', (e) => {
        const panelWidth = hoverPanel.offsetWidth;
        const panelHeight = hoverPanel.offsetHeight;
        const pageWidth = window.innerWidth;
        const pageHeight = window.innerHeight;

        let leftPosition = e.pageX + 15;
        let topPosition = e.pageY + 15;

        // Check if the hover panel would extend beyond the right edge
        if (leftPosition + panelWidth > pageWidth) {
            leftPosition = e.pageX - panelWidth - 15;
        }

        // Check if the hover panel would extend beyond the bottom edge
        if (topPosition + panelHeight > pageHeight) {
            topPosition = e.pageY - panelHeight - 15;
        }

        hoverPanel.style.left = leftPosition + 'px';
        hoverPanel.style.top = topPosition + 'px';
    });

    resultsDiv.append(resultDiv)
    return { body, hoverPanel }
}

function createChatHistoryPopup(filename) {
    const chatPopups = document.getElementById('chat-container')

    // Create the chat popup
    const chatPopupDiv = document.createElement('div');
    chatPopupDiv.className = 'chat-popup';
    chatPopupDiv.id = `chat-popup-${filename}`;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'header';

    const closeChatButton = document.createElement('button');
    closeChatButton.className = 'close-button';
    closeChatButton.innerText = 'Close';
    closeChatButton.addEventListener('click', () => {
        document.getElementById(`chat-popup-${filename}`).style.display = 'none';
    });

    const chatTitle = document.createElement('h4');
    chatTitle.innerText = 'Chat History';

    headerDiv.appendChild(chatTitle);
    headerDiv.appendChild(closeChatButton);

    const chatContentDiv = document.createElement('div');
    chatContentDiv.className = 'chat-content';

    const chatHistory = document.createElement('ul');
    chatHistory.id = `chat-history-${filename}`;

    chatContentDiv.appendChild(chatHistory);

    chatPopupDiv.appendChild(headerDiv);
    chatPopupDiv.appendChild(chatContentDiv);

    chatPopups.append(chatPopupDiv)
    return chatPopupDiv
}

function fetchUpload(index, filename, data, username) {
    const gameData = data.gameData;
    const loots = data.loots;
    const chat = data.chatData

    const gameDataHtml = `
    <strong>Game Information:</strong><br>
    Version: ${gameData.version || 0}<br>
    Length: ${gameData.length}<br>
    Map: ${gameData.map}<br>
    Host: ${gameData.host}<br>
    Game Name: ${gameData.gameName}`;

    const row = createRow(index, filename);
    createChatHistoryPopup(filename);

    row.hoverPanel.innerHTML = gameDataHtml;

    if (loots.length === 0) {
        row.body.innerText = 'No items found.';
    } else {
        row.body.innerText = loots.filter(loot => loot.playerName.toLowerCase().includes(username.toLowerCase())).map(loot => {
            return `${loot.gameTime} ${loot.playerName}: ${loot.itemName}`
        }).join('\n');
    }

    fetchChatHistory(filename, chat); // Function to fetch and display chat history
}

function fetchChatHistory(fileName, chatData) {
    const chatHistory = document.getElementById(`chat-history-${fileName}`);
    chatHistory.innerHTML = ''; // Clear previous chat history

    chatData.forEach(chat => {
        const chatLine = document.createElement('li');
        chatLine.innerHTML = `<span style="color: inherit;">[${chat.mode}] ${chat.time} <span style="color:#${chat.color};">${chat.player}</span>: ${chat.message}</span>`;
        chatHistory.appendChild(chatLine);
    });

    const chatButton = document.getElementById(`open-button-${fileName}`)
    chatButton.disabled = false
}

// Function to get unique data based on id and newest timestamp
function filterUniqueNewest(dataArray) {
    const uniqueData = dataArray.reduce((acc, current) => {
        const existing = acc.find(item => item.id === current.id);
        if (!existing || new Date(current.timestamp) > new Date(existing.timestamp)) {
            // If no existing object or current object is newer, replace/add it
            acc = acc.filter(item => item.id !== current.id); // Remove existing
            acc.push(current); // Add current
        }
        return acc;
    }, []);

    return uniqueData;
}

function closeChatPopup() {
    document.getElementById('chatPopup').style.display = 'none';
}