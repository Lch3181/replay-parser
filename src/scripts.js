document.getElementById('uploadForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const files = document.getElementById('fileInput').files;
    const username = document.getElementById('usernameInput').value;
    const resultsDiv = document.getElementById('results');
    const chatPopups = document.getElementById('chat-container')
    resultsDiv.innerHTML = ''; // Clear previous results

    Array.from(files).forEach(file => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-div';
        resultDiv.id = `result-${file.name}`;

        const title = document.createElement('h3');
        title.innerText = file.name;

        const body = document.createElement('p');
        body.innerText = 'Loading...';

        const hoverPanel = document.createElement('div');
        hoverPanel.className = 'hover-panel';
        hoverPanel.innerHTML = "Loading...";

        // Create the chat popup
        const chatPopupDiv = document.createElement('div');
        chatPopupDiv.className = 'chat-popup';
        chatPopupDiv.id = `chat-popup-${file.name}`;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'header';
        
        const closeChatButton = document.createElement('button');
        closeChatButton.className = 'close-button';
        closeChatButton.innerText = 'Close';
        closeChatButton.addEventListener('click', () => {
            document.getElementById(`chat-popup-${file.name}`).style.display = 'none';
        });
        
        const chatTitle = document.createElement('h4');
        chatTitle.innerText = 'Chat History';
        
        headerDiv.appendChild(chatTitle);
        headerDiv.appendChild(closeChatButton);
        
        const chatContentDiv = document.createElement('div');
        chatContentDiv.className = 'chat-content';
        
        const chatHistory = document.createElement('ul');
        chatHistory.id = `chat-history-${file.name}`;
        
        chatContentDiv.appendChild(chatHistory);
        
        chatPopupDiv.appendChild(headerDiv);
        chatPopupDiv.appendChild(chatContentDiv);
        
        // Create the chat button
        const chatButton = document.createElement('button');
        chatButton.disabled = true
        chatButton.id = `open-button-${file.name}`
        chatButton.className = "open-button"
        chatButton.innerText = 'Chat History';
        chatButton.addEventListener('click', () => {
            // Hide all chat-popups
            const chatPopups = document.querySelectorAll('[id^="chat-popup-"]');
            chatPopups.forEach(popup => {
                popup.style.display = 'none';
            });

            document.getElementById(`chat-popup-${file.name}`).style.display = 'block';
        });

        resultDiv.appendChild(chatButton);
        resultDiv.appendChild(title);
        resultDiv.appendChild(body);
        resultDiv.appendChild(hoverPanel);
        resultsDiv.appendChild(resultDiv);
        chatPopups.appendChild(chatPopupDiv)

        const formData = new FormData();
        formData.append('file', file);
        formData.append('username', username);

        resultDiv.addEventListener('mouseenter', () => {
            hoverPanel.style.display = 'block';
        });

        resultDiv.addEventListener('mouseleave', () => {
            hoverPanel.style.display = 'none';
        });

        resultDiv.addEventListener('mousemove', (e) => {
            hoverPanel.style.left = e.pageX + 15 + 'px';
            hoverPanel.style.top = e.pageY + 15 + 'px';
        });

        fetch('/parse-w3g', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                const gameData = data.gameData;
                const loots = data.loots;
                const chat = data.chatData

                const gameDataHtml = `
                <strong>Game Information:</strong><br>
                Version: ${gameData.version || 0}<br>
                Length: ${gameData.length}<br>
                Map: ${gameData.map}<br>
                Host: ${gameData.host}<br>
                Game Name: ${gameData.gameName}
            `;
                hoverPanel.innerHTML = gameDataHtml;

                if (loots.length === 0) {
                    body.innerText = 'No items found.';
                } else {
                    body.innerText = loots.join('\n');
                }

                fetchChatHistory(file.name, chat); // Function to fetch and display chat history
            })
            .catch(error => {
                body.innerText = 'Error: ' + error.message;
            });
    });
});

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

function closeChatPopup() {
    document.getElementById('chatPopup').style.display = 'none';
}
