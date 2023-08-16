let protobufRoot;
let ClientPayload;
let HostPayload;
let SetZoomLevel;
let SetColorScheme;
let demo_protocol;
let Command;
let ZoomEnum;

async function loadProto() {
    const protoResponse = await fetch('demo_protocol.proto');
    const protoText = await protoResponse.text();

    protobufRoot = protobuf.parse(protoText).root;
    ClientPayload = protobufRoot.lookupType("demo_protocol.ClientPayload");
    HostPayload = protobufRoot.lookupType("demo_protocol.HostPayload");
    SetZoomLevel = protobufRoot.lookupType("demo_protocol.SetZoomLevel");
    SetColorScheme = protobufRoot.lookupType("demo_protocol.SetColorScheme");
    Command = protobufRoot.lookupType("demo_protocol.Command");
    demo_protocol = protobufRoot.lookup("demo_protocol");
    ZoomEnum = protobufRoot.lookup("demo_protocol.Zoom");
}


let ws;

function setupWebSocket() {
    ws = new WebSocket('ws://localhost:8085');
    ws.binaryType = "arraybuffer";

    ws.onopen = function(event) {
        console.log('WebSocket connection opened:', event);
    };

    ws.onmessage = function(event) {
        const hostPayload = HostPayload.decode(new Uint8Array(event.data));
        const hostPayloadObject = HostPayload.toObject(hostPayload, {
            enums: String,
        });

        const serverLogs = document.getElementById('serverLogs');
        const codeBlock = document.createElement('code');
        codeBlock.className = 'json';
        codeBlock.textContent = JSON.stringify(hostPayloadObject, null, 2);

        serverLogs.appendChild(codeBlock);
        hljs.highlightBlock(codeBlock);
    };

    ws.onerror = function(event) {
        console.error('WebSocket error:', event);
    };

    ws.onclose = function(event) {
        console.log('WebSocket connection closed:', event);
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
        case 'setZoom':
            fragmentFile = 'setZoomFragment.html';
            break;
        case 'setPallette':
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
    const command = {};

    switch (commandData.commandType) {
        case 'setZoom':
            console.log(ZoomEnum);
            if (commandData.zoomLevel !== undefined) {
                command.setZoom = SetZoomLevel.create({ zoomLevel: ZoomEnum.values[commandData.zoomLevel] });
            }
            break;
        case 'setPallette':
            if (commandData.scheme) {
                command.setPallette = SetColorScheme.create({ scheme: commandData.scheme });
            }
            break;
        // ... handle other commands here using a similar pattern
    }

    const clientPayloadObject = {
        command: command
    };

    const errMsg = ClientPayload.verify(clientPayloadObject);
    if (errMsg) {
        console.error(`Validation error: ${errMsg}`);
        return;
    }

    const message = ClientPayload.create(clientPayloadObject);
    const buffer = ClientPayload.encode(message).finish();

    if (ws.readyState === WebSocket.OPEN) {
        ws.send(buffer);

        const clientLogs = document.getElementById('clientLogs');
        const codeBlock = document.createElement('code');
        codeBlock.className = 'json';
        codeBlock.textContent = JSON.stringify(message, null, 2);

        clientLogs.appendChild(codeBlock);
        hljs.highlightBlock(codeBlock);
    } else {
        console.warn('WebSocket is not open. Cannot send data.');
    }
}

document.getElementById('commandType').addEventListener('change', async function() {
    await displayCommandInputFields();
});

document.getElementById('commandType').addEventListener('change', async function() {
    await displayCommandInputFields();
});

async function init() {
    await loadProto();
    setupWebSocket();
    displayCommandInputFields();
}

init();
