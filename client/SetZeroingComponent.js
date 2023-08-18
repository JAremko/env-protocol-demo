class SetZeroingComponent extends HTMLElement {
    constructor() {
        super();
        this.minValue = -600000;
        this.maxValue = 600000;
        this.increment = 125;
        this.step = 25;
        this.commandType = 'setZeroing';
    }

    connectedCallback() {
        this.render();
        this.sliderX = this.querySelector('#xValueSlider');
        this.numericX = this.querySelector('#xValueNumeric');
        this.sliderY = this.querySelector('#yValueSlider');
        this.numericY = this.querySelector('#yValueNumeric');
        this.button = this.querySelector('.button');

        this.sliderX.addEventListener('input', this.handleSliderXInput.bind(this));
        this.numericX.addEventListener('input', this.handleNumericXInput.bind(this));
        this.sliderY.addEventListener('input', this.handleSliderYInput.bind(this));
        this.numericY.addEventListener('input', this.handleNumericYInput.bind(this));
        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    render() {
        this.innerHTML = `
            <div>
                <div class="field">
                    <label class="label">Set X Zeroing</label>
                    <div class="control">
                        <div class="level">
                            <p>${this.minValue}</p>
                            <input type="range" id="xValueSlider" min="${this.minValue}" max="${this.maxValue}" value="${this.minValue}" step="${this.step}" style="flex-grow: 1;">
                            <p>${this.maxValue}</p>
                        </div>
                    </div>
                    <div class="control has-icons-left">
                        <input type="number" class="input" id="xValueNumeric" min="${this.minValue}" max="${this.maxValue}" value="${this.minValue}" step="${this.step}">
                    </div>
                </div>
                <div class="field">
                    <label class="label">Set Y Zeroing</label>
                    <div class="control">
                        <div class="level">
                            <p>${this.minValue}</p>
                            <input type="range" id="yValueSlider" min="${this.minValue}" max="${this.maxValue}" value="${this.minValue}" step="${this.step}" style="flex-grow: 1;">
                            <p>${this.maxValue}</p>
                        </div>
                    </div>
                    <div class="control has-icons-left">
                        <input type="number" class="input" id="yValueNumeric" min="${this.minValue}" max="${this.maxValue}" value="${this.minValue}" step="${this.step}">
                    </div>
                </div>
                <button class="button is-primary">Send Zeroing Data</button>
            </div>
        `;
    }

    handleSliderXInput() {
        this.updateNumericValue(this.sliderX, this.numericX);
        this.checkValueForErrorColor(this.numericX);
    }

    handleNumericXInput() {
        this.updateSliderValue(this.numericX, this.sliderX);
        this.checkValueForErrorColor(this.numericX);
    }

    handleSliderYInput() {
        this.updateNumericValue(this.sliderY, this.numericY);
        this.checkValueForErrorColor(this.numericY);
    }

    handleNumericYInput() {
        this.updateSliderValue(this.numericY, this.sliderY);
        this.checkValueForErrorColor(this.numericY);
    }

    updateNumericValue(slider, numeric) {
        numeric.value = slider.value;
    }

    updateSliderValue(numeric, slider) {
        slider.value = numeric.value;
    }

    checkValueForErrorColor(numeric) {
        if (parseInt(numeric.value, 10) % this.increment !== 0) {
            numeric.classList.add('is-danger');
        } else {
            numeric.classList.remove('is-danger');
        }
    }

    sendDataToServer() {
        const commandData = {
            commandType: this.commandType,
            x: parseInt(this.numericX.value, 10),
            y: parseInt(this.numericY.value, 10)
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('set-zeroing-component', SetZeroingComponent);
