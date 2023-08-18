class SetDistanceComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="field">
                <label class="label">Distance (deciMeter)</label>
                <div class="control">
                    <input type="number"
                    id="distance"
                    placeholder="Enter distance in deciMeter">
                </div>
            </div>
            <button class="button is-primary">Send Distance</button>
        `;

        this.button = this.querySelector('.button');
        this.input = this.querySelector('#distance');

        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    sendDataToServer() {
        const commandData = {
            commandType: 'setDst',
            distance: parseFloat(this.input.value, 10)
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('set-distance-component', SetDistanceComponent);

