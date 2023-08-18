class TriggerCmdComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="field">
                <label class="label">Trigger Command</label>
                <div class="control">
                    <div class="select">
                        <select id="cmdTrigger">
                            <option value="CALIBRATE_ACCEL_GYRO">CALIBRATE_ACCEL_GYRO</option>
                            <option value="LRF_MEASUREMENT">LRF_MEASUREMENT</option>
                            <!-- Add other options similarly -->
                        </select>
                    </div>
                </div>
            </div>
            <button class="button is-primary">Send Trigger Command</button>
        `;

        this.button = this.querySelector('.button');
        this.select = this.querySelector('#cmdTrigger');

        this.button.addEventListener('click', this.sendDataToServer.bind(this));
    }

    sendDataToServer() {
        const commandData = {
            commandType: 'cmdTrigger',
            cmd: this.select.value
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('trigger-cmd-component', TriggerCmdComponent);
