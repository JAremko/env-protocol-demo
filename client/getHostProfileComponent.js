class GetHostProfileComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="field">
                <label class="label">Get Host Profile</label>
            </div>
            <button class="button is-primary">Request Host Profile</button>
        `;

        this.button = this.querySelector('.button');
        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    sendDataToServer() {
        const commandData = {
            commandType: 'getHostProfile'
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('get-host-profile-component', GetHostProfileComponent);
