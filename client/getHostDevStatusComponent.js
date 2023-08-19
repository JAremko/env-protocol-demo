class GetHostDevStatusComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="field">
                <label class="label">Get Host Device Status</label>
            </div>
            <button class="button is-primary">Request Host Device Status</button>
        `;

        this.button = this.querySelector('.button');
        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    sendDataToServer() {
        const commandData = {
            commandType: 'getHostDevStatus'
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('get-host-dev-status-component', GetHostDevStatusComponent);
