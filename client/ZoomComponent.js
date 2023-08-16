class ZoomComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="field">
                <label class="label">Zoom Level</label>
                <div class="control">
                    <div class="select">
                        <select id="zoomLevel">
                            <option value="ZOOM_X1">X1</option>
                            <option value="ZOOM_X2">X2</option>
                            <option value="ZOOM_X3">X3</option>
                            <option value="ZOOM_X4">X4</option>
                            <option value="ZOOM_X6">X6</option>
                        </select>
                    </div>
                </div>
            </div>
            <button class="button is-primary">Send Zoom Level</button>
        `;

        this.button = this.querySelector('.button');
        this.select = this.querySelector('#zoomLevel');

        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    sendDataToServer() {
        const commandData = {
            commandType: 'setZoom',
            zoomLevel: this.select.value
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('zoom-component', ZoomComponent);
