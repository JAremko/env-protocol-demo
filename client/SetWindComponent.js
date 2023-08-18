class SetWindComponent extends HTMLElement {
    constructor() {
        super();
        this.minDirection = 0;
        this.maxDirection = 359;
        this.minSpeed = 0;
        this.maxSpeed = 200;
        this.commandType = 'setWind';
    }

    connectedCallback() {
        this.render();
        this.sliderDirection = this.querySelector('#windDirectionSlider');
        this.numericDirection = this.querySelector('#windDirectionNumeric');
        this.sliderSpeed = this.querySelector('#windSpeedSlider');
        this.numericSpeed = this.querySelector('#windSpeedNumeric');
        this.button = this.querySelector('.button');

        this.sliderDirection.addEventListener('input', this.handleSliderDirectionInput.bind(this));
        this.numericDirection.addEventListener('input', this.handleNumericDirectionInput.bind(this));
        this.sliderSpeed.addEventListener('input', this.handleSliderSpeedInput.bind(this));
        this.numericSpeed.addEventListener('input', this.handleNumericSpeedInput.bind(this));
        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    render() {
        this.innerHTML = `
            <div>
                <div class="field">
                    <label class="label">Set Wind Direction</label>
                    <div class="control">
                        <div class="level">
                            <p>${this.minDirection}</p>
                            <input type="range" id="windDirectionSlider" min="${this.minDirection}" max="${this.maxDirection * 2}" value="${this.minDirection}" style="flex-grow: 1;">
                            <p>${this.maxDirection * 2}</p>
                        </div>
                    </div>
                    <div class="control has-icons-left">
                        <input type="number" class="input" id="windDirectionNumeric" min="${this.minDirection}" max="${this.maxDirection * 2}" value="${this.minDirection}">
                    </div>
                </div>
                <div class="field">
                    <label class="label">Set Wind Speed</label>
                    <div class="control">
                        <div class="level">
                            <p>${this.minSpeed}</p>
                            <input type="range" id="windSpeedSlider" min="${this.minSpeed}" max="${this.maxSpeed * 2}" value="${this.minSpeed}" style="flex-grow: 1;">
                            <p>${this.maxSpeed * 2}</p>
                        </div>
                    </div>
                    <div class="control has-icons-left">
                        <input type="number" class="input" id="windSpeedNumeric" min="${this.minSpeed}" max="${this.maxSpeed * 2}" value="${this.minSpeed}">
                    </div>
                </div>
                <button class="button is-primary">Send Wind Data</button>
            </div>
        `;
    }

    handleSliderDirectionInput() {
        this.updateNumericValue(this.sliderDirection, this.numericDirection);
        this.checkValueForErrorColor(this.numericDirection, this.maxDirection);
    }

    handleNumericDirectionInput() {
        this.updateSliderValue(this.numericDirection, this.sliderDirection);
        this.checkValueForErrorColor(this.numericDirection, this.maxDirection);
    }

    handleSliderSpeedInput() {
        this.updateNumericValue(this.sliderSpeed, this.numericSpeed);
        this.checkValueForErrorColor(this.numericSpeed, this.maxSpeed);
    }

    handleNumericSpeedInput() {
        this.updateSliderValue(this.numericSpeed, this.sliderSpeed);
        this.checkValueForErrorColor(this.numericSpeed, this.maxSpeed);
    }

    updateNumericValue(slider, numeric) {
        numeric.value = slider.value;
    }

    updateSliderValue(numeric, slider) {
        slider.value = numeric.value;
    }

    checkValueForErrorColor(numeric, max) {
        if (parseInt(numeric.value, 10) > max) {
            numeric.classList.add('is-danger');
        } else {
            numeric.classList.remove('is-danger');
        }
    }

    sendDataToServer() {
        const commandData = {
            commandType: this.commandType,
            direction: parseInt(this.numericDirection.value, 10),
            speed: parseInt(this.numericSpeed.value, 10)
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('set-wind-component', SetWindComponent);
