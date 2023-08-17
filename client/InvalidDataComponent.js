class InvalidDataComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <button class="button is-danger">Send!</button>
        `;

        this.button = this.querySelector('.button');
        this.button.addEventListener('click', this.sendInvalidDataToServer.bind(this));
    }

    sendInvalidDataToServer() {
        const commandData = {
            commandType: 'invalid',
        };
        sendCommandToServer(commandData);
    }
}

customElements.define('invalid-data-component', InvalidDataComponent);
