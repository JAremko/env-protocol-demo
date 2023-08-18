class SetAirHumidityComponent extends HTMLElement {
    constructor() {
        super();
        this.min = 0;
        this.max = 150;
        this.commandType = 'setAirHum';
        this.iconClass = 'fas fa-tint';
    }

    connectedCallback() {
        this.render();
        this.slider = this.querySelector('#humiditySlider');
        this.numeric = this.querySelector('#humidityNumeric');
        this.button = this.querySelector('.button');

        this.slider.addEventListener('input', this.handleSliderInput.bind(this));
        this.numeric.addEventListener('input', this.handleNumericInput.bind(this));
        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    render() {
        this.innerHTML = `
            <div>
                <div class="field">
                    <label class="label">Set Air Humidity</label>
                    <div class="control">
                        <div class="level">
                            <p>${this.min}</p>
                            <input type="range" id="humiditySlider" min="${this.min}" max="${this.max}" value="0" style="flex-grow: 1;">
                            <p>${this.max}</p>
                        </div>
                    </div>
                    <div class="control has-icons-left">
                        <input type="number" class="input" id="humidityNumeric" min="${this.min}" max="${this.max}" value="0">
                        <span class="icon is-small is-left">
                          <i class="${this.iconClass}"></i>
                        </span>
                    </div>
                </div>
                <button class="button is-primary">Send Air Humidity</button>
            </div>
        `;
    }

    handleSliderInput() {
        this.updateNumericValue(this.slider.value);
        this.checkValueForErrorColor();
    }

    handleNumericInput() {
        this.updateSliderValue(this.numeric.value);
        this.checkValueForErrorColor();
    }

    updateNumericValue(value) {
        this.numeric.value = value;
    }

    updateSliderValue(value) {
        this.slider.value = value;
    }

    checkValueForErrorColor() {
        if (parseInt(this.numeric.value, 10) > 100) {
            this.numeric.classList.add('is-danger');
        } else {
            this.numeric.classList.remove('is-danger');
        }
    }

    sendDataToServer() {
        const commandData = {
            commandType: this.commandType,
            humidity: parseInt(this.numeric.value, 10)
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('set-air-humidity-component', SetAirHumidityComponent);
