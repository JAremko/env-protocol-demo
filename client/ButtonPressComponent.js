class ButtonPressComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="field">
                <label class="label">Button Press</label>
                <div class="control">
                    <div class="select">
                        <select id="buttonPress">
                            <option value="MENU_SHORT">MENU_SHORT</option>
                            <option value="MENU_LONG">MENU_LONG</option>
                            <option value="UP_SHORT">UP_SHORT</option>
                            <!-- Add other options similarly -->
                        </select>
                    </div>
                </div>
            </div>
            <button class="button is-primary">Send Button Press</button>
        `;

        this.button = this.querySelector('.button');
        this.select = this.querySelector('#buttonPress');

        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    sendDataToServer() {
        const commandData = {
            commandType: 'buttonPress',
            button: this.select.value
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('button-press-component', ButtonPressComponent);
