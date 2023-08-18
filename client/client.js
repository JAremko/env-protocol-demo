const protobufMessageTypes = {
    ClientPayload: null,
    HostPayload: null,
    SetZoomLevel: null,
    SetColorScheme: null,
    SetAirTemp: null,
    SetDistance: null,
    SetAgcMode: null,
    Command: null
};

const protobufEnums = {
    Zoom: null,
    ColorScheme: null,
    AGCMode: null
};

let ws;
let getCommandMappings;

async function loadProto() {
    const protoResponse = await fetch('demo_protocol.proto');
    const protoText = await protoResponse.text();
    const protobufRoot = protobuf.parse(protoText).root;

    for (let type in protobufMessageTypes) {
        protobufMessageTypes[type] = protobufRoot.lookupType(`demo_protocol.${type}`);
    }

    for (let enumType in protobufEnums) {
        protobufEnums[enumType] = protobufRoot.lookup(`demo_protocol.${enumType}`);
    }

    getCommandMappings = () => ({
        setZoom: data =>
            ({ setZoom: protobufMessageTypes.SetZoomLevel.create({ zoomLevel: protobufEnums.Zoom.values[data.zoomLevel] }) }),
        setPallette: data =>
            ({ setPallette: protobufMessageTypes.SetColorScheme.create({ scheme: protobufEnums.ColorScheme.values[data.scheme] }) }),
        setAirTemp: data =>
            ({ setAirTC: protobufMessageTypes.SetAirTemp.create({ temperature: data.temperature }) }),
        setDst: data =>
            ({ setDst: protobufMessageTypes.SetDistance.create({ distance: data.distance }) }),
        setAgc: data =>
            ({ setAgc: protobufMessageTypes.SetAgcMode.create({ mode: protobufEnums.AGCMode.values[data.agcMode] })}),
        invalid: () => ({})
    });
}

function setupWebSocket() {
    ws = new WebSocket('ws://localhost:8085');
    ws.binaryType = "arraybuffer";

    ws.onopen = event => console.log('WebSocket connection opened:', event);
    ws.onerror = event => console.error('WebSocket error:', event);
    ws.onclose = event => console.log('WebSocket connection closed:', event);

    ws.onmessage = event => handleServerMessage(event.data);
}

function handleServerMessage(data) {
    const hostPayload = protobufMessageTypes.HostPayload.decode(new Uint8Array(data));
    const hostPayloadObject = protobufMessageTypes.HostPayload.toObject(hostPayload, { enums: String, defaults: true });
    displayServerLog(hostPayloadObject);
}

function displayServerLog(data) {
    const serverLogs = document.getElementById('serverLogs');
    const codeBlock = document.createElement('code');
    codeBlock.className = 'json';
    codeBlock.textContent = JSON.stringify(data, null, 2);

    serverLogs.insertBefore(codeBlock, serverLogs.firstChild);
    hljs.highlightBlock(codeBlock);
}

async function fetchFragment(fragmentName) {
    try {
        return await (await fetch(fragmentName)).text();
    } catch (error) {
        console.warn('Error fetching the fragment:', error);
        return '';
    }
}

function displayCommandInputFields() {
    const selectedCommand = document.getElementById('commandType').value;
    const commandInputContainer = document.getElementById('commandInputFields');
    commandInputContainer.innerHTML = ''; // Clear the container

    let component;
    switch (selectedCommand) {
        case 'setZoom':
            component = new ZoomComponent();
            break;
        case 'setPallette':
            component = new ColorSchemeComponent();
            break;
        case 'setAirTemp':
            component = new AirTempComponent();
            break;
        case 'setDst':
            component = new SetDistanceComponent();
            break;
        case 'setAgc':
            component = new SetAgcModeComponent();
            break;
        case 'invalid':
            component = new InvalidDataComponent();
            break;
    }

    if (component) {
        commandInputContainer.appendChild(component);
    }
}

function sendCommandToServer(commandData) {
    const commandMappings = getCommandMappings();
    const command = commandMappings[commandData.commandType](commandData);

    const clientPayloadObject = { command };

    const errMsg = protobufMessageTypes.ClientPayload.verify(clientPayloadObject);
    if (errMsg) {
        console.error(`Validation error: ${errMsg}`);
        return;
    }

    const message = protobufMessageTypes.ClientPayload.create(clientPayloadObject);
    const buffer = protobufMessageTypes.ClientPayload.encode(message).finish();

    if (ws.readyState === WebSocket.OPEN) {
        ws.send(buffer);
        displayClientLog(message);
    } else {
        console.warn('WebSocket is not open. Cannot send data.');
    }
}

function displayClientLog(data) {
    const clientLogs = document.getElementById('clientLogs');
    const codeBlock = document.createElement('code');
    codeBlock.className = 'json';
    codeBlock.textContent = JSON.stringify(data, null, 2);

    clientLogs.insertBefore(codeBlock, clientLogs.firstChild);
    hljs.highlightBlock(codeBlock);
}

document.getElementById('commandType').addEventListener('change', displayCommandInputFields);

async function init() {
    await loadProto();
    setupWebSocket();
    displayCommandInputFields();
}

init();

