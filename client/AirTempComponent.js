class AirTempComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div>
                <div class="field">
                    <label class="label">Air Temperature (C°)</label>
                    <div class="control">
                        <input type="range" id="airTempSlider" min="-100" max="100" value="0">
                        <input type="number" id="airTempNumeric" min="-100" max="100" value="0">
                    </div>
                </div>

                <button class="button is-primary">Send Air Temperature</button>
            </div>
        `;

        this.slider = this.querySelector('#airTempSlider');
        this.numeric = this.querySelector('#airTempNumeric');
        this.button = this.querySelector('.button');

        this.slider.addEventListener('input', () => this.updateNumericValue(this.slider.value));
        this.numeric.addEventListener('input', () => this.updateSliderValue(this.numeric.value));
        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    updateNumericValue(value) {
        this.numeric.value = value;
    }

    updateSliderValue(value) {
        this.slider.value = value;
    }

    sendDataToServer() {
        const commandData = {
            commandType: 'setAirTemp',
            temperature: parseInt(this.numeric.value, 10)
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('air-temp-component', AirTempComponent);
