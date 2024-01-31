import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class RecordLink extends NavigationMixin(LightningElement) {
    @api recordId;
    @api valueToLink;
    @api objectApiName;

    @track recordUrl;

    pageRef;

    connectedCallback() {
        this.pageRef = {
            type: "standard__recordPage",
            attributes: {
                recordId: this.recordId,
                objectApiName: this.objectApiName,
                actionName: "view"
            }
        }
        this[NavigationMixin.GenerateUrl](this.pageRef)
        .then(recordUrl => {
            this.recordUrl = recordUrl;
        })
    }

    goToRecord(event) {
        event.preventDefault();
        event.stopPropagation();
        this[NavigationMixin.Navigate](this.pageRef);
    }
}