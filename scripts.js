document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const files = document.getElementById('fileInput').files;
    const username = document.getElementById('usernameInput').value;
    const resultsDiv = document.getElementById('results');
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

        resultDiv.appendChild(title);
        resultDiv.appendChild(body);
        resultDiv.appendChild(hoverPanel);
        resultsDiv.appendChild(resultDiv);

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

            const gameDataHtml = `
                <strong>Game Infomation:</strong><br>
                Version: ${gameData.version || 0}<br>
                Length: ${gameData.length}<br>
                Map: ${gameData.map}<br>
                Host: ${gameData.host}<br>
                Game Name: ${gameData.gameName}
            `;
            hoverPanel.innerHTML = gameDataHtml;

            body.innerText = loots.join('\n');
        })
        .catch(error => {
            body.innerText = 'Error: ' + error.message;
        });
    });
});