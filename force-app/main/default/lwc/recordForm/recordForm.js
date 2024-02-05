import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord } from 'lightning/uiRecordApi';


export default class RecordForm extends LightningElement {
    @api recordId;
    @api label;
    @api createOrEdit;
    @api objectApiName;
    @api recordType;  //expects the record type label (NOT the record type developer name)
    @api relatedParentRecord;
    @api parentLookupField;
    @api customLayoutOverride = false;
    @api variant;

    @track showObjectModal;
    @track objectInfo;

    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    objectInfo;

    get recordTypeId() {
        if (this.recordType){
            const rtis = this.objectInfo.data.recordTypeInfos;
            let id = Object.keys(rtis).find(rti => rtis[rti].name === this.recordType);
            if (id){
                return id;
            } else {
                this.showCustomToast(
                    'Error',
                    `No record type with the following label: ${this.recordType}. Lightning web component "recordForm" expects record type label NOT record type developer name.`,
                    'error',
                    'sticky'
                );
            }
        }
    }

    handleSubmit(event) {
        event.preventDefault();
        let record = JSON.parse(JSON.stringify(event.detail));
        record.apiName = this.objectApiName;
        if (this.parentLookupField && this.relatedParentRecord) {
            console.log('handling record submit with parent lookup field');
            record.fields[this.parentLookupField] = this.relatedParentRecord;
        }
        if (this.createOrEdit === 'Create') {
            createRecord(record)
                .then(result => {
                    console.log('result', result);
                    this.showCustomToast('Success', 'Created new record', 'success', 'dismissable');
                    this.dispatchEvent(new CustomEvent('childsubmit'))
                })
                .catch(error => {
                    console.log('error', error);
                    this.showCustomToast('Error', error.body.message, 'error', 'sticky');
                })
        } else if (this.createOrEdit === 'Edit') {
            console.log('recordinput on update', record);
            record.fields.Id = this.recordId;
            delete record.apiName;
            updateRecord(record)
                .then(result => {
                    console.log('result', result);
                    this.showCustomToast('Success', 'Updated record', 'success', 'dismissable');
                    this.dispatchEvent(new CustomEvent('childsubmit'))
                })
                .catch(error => {
                    console.log('error', error);
                    this.showCustomToast('Error', error.body.message, 'error', 'sticky');
                })
        }
        this.closeObjectModal();
    }

    showCustomToast(title, message, variant, mode) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant,
                mode: mode
            })
        );
    }

    handleCancel(event) {
        this.closeObjectModal();
    }

    openObjectModal() {
        this.showObjectModal = true;
    }

    closeObjectModal() {
        this.showObjectModal = false;
        //this.resetModalSpinner();
    }
}