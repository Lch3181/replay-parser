document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const files = document.getElementById('fileInput').files;
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

        resultDiv.appendChild(title);
        resultDiv.appendChild(body);
        resultsDiv.appendChild(resultDiv);

        const formData = new FormData();
        formData.append('file', file);

        fetch('/parse-w3g', {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(result => {
            body.innerText = result;
        })
        .catch(error => {
            body.innerText = 'Error: ' + error.message;
        });
    });
});