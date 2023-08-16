let ws;

function setupWebSocket() {
    ws = new WebSocket('ws://localhost:8085');

    ws.onopen = function (event) {
        console.log('WebSocket connection opened:', event);
    };

    ws.onmessage = function (event) {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            console.error('Failed to parse incoming WebSocket message:', e);
            return;
        }

        const serverLogs = document.getElementById('serverLogs');

        const codeBlock = document.createElement('code');
        codeBlock.className = 'json';
        codeBlock.textContent = JSON.stringify(data, null, 2);

        serverLogs.appendChild(codeBlock);
        hljs.highlightBlock(codeBlock);
    };


    ws.onerror = function (event) {
        console.error('WebSocket error:', event);
    };

    ws.onclose = function (event) {
        console.log('WebSocket connection closed:', event);
        // You could set up a mechanism here to retry the connection if needed
    };
}

async function fetchFragment(fragmentName) {
    try {
        const response = await fetch(fragmentName);
        const html = await response.text();
        return html;
    } catch (error) {
        console.warn('Error fetching the fragment:', error);
        return '';
    }
}

async function displayCommandInputFields() {
    let selectedCommand = document.getElementById('commandType').value;
    let commandInputContainer = document.getElementById('commandInputFields');
    commandInputContainer.innerHTML = '';

    let fragmentFile;
    switch (selectedCommand) {
        case 'set_zoom':
            fragmentFile = 'setZoomFragment.html';
            break;
        case 'set_pallette':
            fragmentFile = 'setColorSchemeFragment.html';
            break;
        // ... continue for other commands
    }

    if (fragmentFile) {
        const fragmentContent = await fetchFragment(fragmentFile);
        commandInputContainer.innerHTML = fragmentContent;
    }
}

function sendCommandToServer(commandData) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(commandData));

        const clientLogs = document.getElementById('clientLogs');

        const codeBlock = document.createElement('code');
        codeBlock.className = 'json';
        codeBlock.textContent = JSON.stringify(commandData, null, 2);

        clientLogs.appendChild(codeBlock);
        hljs.highlightBlock(codeBlock);
    } else {
        console.warn('WebSocket is not open. Cannot send data.');
    }
}


document.getElementById('commandType').addEventListener('change', async function () {
    await displayCommandInputFields();
});

// Initial setup:
setupWebSocket();
displayCommandInputFields();
