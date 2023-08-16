class ColorSchemeComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="field">
                <label class="label">Color Scheme</label>
                <div class="control">
                    <div class="select">
                        <select id="colorScheme">
                            <option value="SEPIA">Sepia</option>
                            <option value="BLACK_HOT">Black hot</option>
                            <option value="WHITE_HOT">White hot</option>
                        </select>
                    </div>
                </div>
            </div>
            <button class="button is-primary">Send Color Scheme</button>
        `;

        this.button = this.querySelector('.button');
        this.select = this.querySelector('#colorScheme');

        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    sendDataToServer() {
        const commandData = {
            commandType: 'setPallette',
            scheme: this.select.value
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('color-scheme-component', ColorSchemeComponent);
