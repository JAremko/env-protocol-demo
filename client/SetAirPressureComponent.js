class SetAirPressureComponent extends HTMLElement {
    constructor() {
        super();
        this.min = 3000;
        this.max = 12000;
        this.commandType = 'setAirPress';
        this.iconClass = 'fas fa-tachometer-alt'; // I've chosen a tachometer icon, you can change it if you have a more suitable one.
    }

    connectedCallback() {
        this.render();
        this.slider = this.querySelector('#pressureSlider');
        this.numeric = this.querySelector('#pressureNumeric');
        this.button = this.querySelector('.button');

        this.slider.addEventListener('input', this.handleSliderInput.bind(this));
        this.numeric.addEventListener('input', this.handleNumericInput.bind(this));
        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    render() {
        this.innerHTML = `
            <div>
                <div class="field">
                    <label class="label">Set Air Pressure</label>
                    <div class="control">
                        <div class="level">
                            <p>${this.min}</p>
                            <input type="range" id="pressureSlider" min="${this.min}" max="${this.max * 2}" value="${this.min}" style="flex-grow: 1;">
                            <p>${this.max}</p>
                        </div>
                    </div>
                    <div class="control has-icons-left">
                        <input type="number" class="input" id="pressureNumeric" min="${this.min}" max="${this.max * 2}" value="${this.min}">
                        <span class="icon is-small is-left">
                          <i class="${this.iconClass}"></i>
                        </span>
                    </div>
                </div>
                <button class="button is-primary">Send Air Pressure</button>
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
        if (parseInt(this.numeric.value, 10) > this.max || parseInt(this.numeric.value, 10) < this.min) {
            this.numeric.classList.add('is-danger');
        } else {
            this.numeric.classList.remove('is-danger');
        }
    }

    sendDataToServer() {
        const commandData = {
            commandType: this.commandType,
            pressure: parseInt(this.numeric.value, 10)
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('set-air-pressure-component', SetAirPressureComponent);
