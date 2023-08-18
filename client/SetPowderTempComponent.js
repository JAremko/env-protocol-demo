class SetPowderTempComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div>
                <div class="field">
                    <label class="label">Set Powder Temperature</label>
                    <div class="control">
                        <div class="level">
                            <p>-100</p>
                            <input type="range" id="powderTempSlider" min="-100" max="100" value="0" style="flex-grow: 1;">
                            <p>100</p>
                        </div>
                    </div>
                    <div class="control has-icons-left">
                        <input type="number" class="input" id="powderTempNumeric" min="-100" max="100" value="0">
                        <span class="icon is-small is-left">
                          <i class="fas fa-temperature-low"></i>
                        </span>
                    </div>
                </div>

                <button class="button is-primary">Send Powder Temperature</button>
            </div>
        `;

        this.slider = this.querySelector('#powderTempSlider');
        this.numeric = this.querySelector('#powderTempNumeric');
        this.button = this.querySelector('.button');

        this.slider.addEventListener('input', () => {
            this.updateNumericValue(this.slider.value);
            this.checkValueForErrorColor();
        });

        this.numeric.addEventListener('input', () => {
            this.updateSliderValue(this.numeric.value);
            this.checkValueForErrorColor();
        });

        this.button.addEventListener('click', this.sendDataToServer.bind(this));
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
            commandType: 'setPowderTemp',
            temperature: parseInt(this.numeric.value, 10)
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('set-powder-temp-component', SetPowderTempComponent);
