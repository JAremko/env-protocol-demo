class SetCompassOffsetComponent extends HTMLElement {
    constructor() {
        super();
        this.min = -360;
        this.max = 360;
        this.commandType = 'setMagOffset';
    }

    connectedCallback() {
        this.render();
        this.slider = this.querySelector('#offsetSlider');
        this.numeric = this.querySelector('#offsetNumeric');
        this.button = this.querySelector('.button');

        this.slider.addEventListener('input', this.handleSliderInput.bind(this));
        this.numeric.addEventListener('input', this.handleNumericInput.bind(this));
        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    render() {
        this.innerHTML = `
            <div>
                <div class="field">
                    <label class="label">Set Compass Offset</label>
                    <div class="control">
                        <div class="level">
                            <p>${this.min}</p>
                            <input type="range" id="offsetSlider" min="${this.min}" max="${this.max * 2}" value="${this.min}" style="flex-grow: 1;">
                            <p>${this.max * 2}</p>
                        </div>
                    </div>
                    <div class="control has-icons-left">
                        <input type="number" class="input" id="offsetNumeric" min="${this.min}" max="${this.max * 2}" value="${this.min}">
                    </div>
                </div>
                <button class="button is-primary">Send Compass Offset</button>
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
            offset: parseInt(this.numeric.value, 10)
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('set-compass-offset-component', SetCompassOffsetComponent);
