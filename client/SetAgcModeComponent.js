class SetAgcModeComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="field">
                <label class="label">AGC Mode</label>
                <div class="control">
                    <div class="select">
                        <select id="agcMode">
                            <option value="AUTO_1">AUTO 1</option>
                            <option value="AUTO_2">AUTO 2</option>
                        </select>
                    </div>
                </div>
            </div>
            <button class="button is-primary">Send AGC Mode</button>
        `;

        this.button = this.querySelector('.button');
        this.select = this.querySelector('#agcMode');

        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    sendDataToServer() {
        const commandData = {
            commandType: 'setAgc',
            agcMode: this.select.value
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('set-agc-mode-component', SetAgcModeComponent);

