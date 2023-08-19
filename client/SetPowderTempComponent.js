class SetPowderTempComponent extends HTMLElement {
    constructor() {
        super();
        this.min = -100;
        this.max = 100;
        this.commandType = 'setPowderTemp';
    }

    connectedCallback() {
        this.render();
        this.slider = this.querySelector('#powderTempSlider');
        this.numeric = this.querySelector('#powderTempNumeric');
        this.button = this.querySelector('.button');

        this.slider.addEventListener('input', this.handleSliderInput.bind(this));
        this.numeric.addEventListener('input', this.handleNumericInput.bind(this));
        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    render() {
        this.innerHTML = `
            <div>
                <div class="field">
                    <label class="label">Set Powder Temperature</label>
                    <div class="control">
                        <div class="level">
                            <p>${this.min}</p>
                            <input type="range" id="powderTempSlider" min="${this.min}" max="${this.max * 2}" value="0" style="flex-grow: 1;">
                            <p>${this.max * 2}</p>
                        </div>
                    </div>
                    <div class="control has-icons-left">
                        <input type="number" class="input" id="powderTempNumeric" min="${this.min}" max="${this.max * 2}" value="0">
                    </div>
                </div>
                <button class="button is-primary">Send Powder Temperature</button>
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
            temperature: parseInt(this.numeric.value, 10)
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('set-powder-temp-component', SetPowderTempComponent);
