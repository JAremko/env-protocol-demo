let protobufRoot;
let ClientPayload;
let HostPayload;
let SetZoomLevel;
let SetColorScheme;
let setAirTemp;
let demo_protocol;
let Command;
let ZoomEnum;
let ColorSchemeEnum;

async function loadProto() {
    const protoResponse = await fetch('demo_protocol.proto');
    const protoText = await protoResponse.text();

    protobufRoot = protobuf.parse(protoText).root;
    ClientPayload = protobufRoot.lookupType("demo_protocol.ClientPayload");
    HostPayload = protobufRoot.lookupType("demo_protocol.HostPayload");
    SetZoomLevel = protobufRoot.lookupType("demo_protocol.SetZoomLevel");
    SetColorScheme = protobufRoot.lookupType("demo_protocol.SetColorScheme");
    setAirTemp = protobufRoot.lookupType("demo_protocol.SetAirTemp");
    Command = protobufRoot.lookupType("demo_protocol.Command");
    demo_protocol = protobufRoot.lookup("demo_protocol");
    ZoomEnum = protobufRoot.lookup("demo_protocol.Zoom");
    ColorSchemeEnum = protobufRoot.lookup("demo_protocol.ColorScheme");
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

function displayCommandInputFields() {
    let selectedCommand = document.getElementById('commandType').value;
    let commandInputContainer = document.getElementById('commandInputFields');

    // Clear previous components
    while (commandInputContainer.firstChild) {
        commandInputContainer.removeChild(commandInputContainer.firstChild);
    }

    switch (selectedCommand) {
        case 'setZoom':
            commandInputContainer.appendChild(new ZoomComponent());
            break;
        case 'setPallette':
            commandInputContainer.appendChild(new ColorSchemeComponent());
            break;
        case 'setAirTemp':
            commandInputContainer.appendChild(new AirTempComponent());
            break;
        // ... continue for other commands
    }
}

function sendCommandToServer(commandData) {
    const command = {};

    switch (commandData.commandType) {
        case 'setZoom':
            command.setZoom = SetZoomLevel.create({ zoomLevel: ZoomEnum.values[commandData.zoomLevel] });
            break;
        case 'setPallette':
             command.setPallette = SetColorScheme.create({ scheme: ColorSchemeEnum.values[commandData.scheme] });
            break;
        case 'setAirTemp':
             command.setAirTemp = setAirTemp.create({ temperature: commandData.temperature });
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
    displayCommandInputFields();
});

document.getElementById('commandType').addEventListener('change', async function() {
    displayCommandInputFields();
});

async function init() {
    await loadProto();
    setupWebSocket();
    displayCommandInputFields();
}

init();
