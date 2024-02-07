import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getShoppingListIngredients from '@salesforce/apex/RecipeIngredientController.getShoppingListIngredients';

export default class DisplayShoppingListIngredients extends LightningElement {
    @api recordId;
    addedIngredients;
    addedIngredientsData;
    recordsToUpdate = {};
    timeoutId;

    @wire(getShoppingListIngredients, {shoppingListId : '$recordId'})
    shoppingListIngredients(result) {
        this.addedIngredientsData = result;
        if (result.data) {
            this.addedIngredients = result.data;
            console.log('added ingredients', this.addedIngredients);
            this.error = undefined;
        } else if (result.error) {
            this.error = error;
            console.log('error', error);
            this.addedIngredients = undefined;
        }
    }

    @api handleIngredientAddition() {
        console.log('in the child apex');
        refreshApex(this.addedIngredientsData);
    }

    handleChildSubmit() {
        this.handleIngredientAddition();
    }

    saveChangedCheckbox(event) {
        clearTimeout(this.timeoutId);
        const fieldName = event.target.fieldName;
        console.log('fieldName', fieldName);
        const value = event.target.value;
        console.log('value', value);
        console.log('target:: ', event.target);
        const dataId = event.target.parentNode.parentNode.parentNode.getAttribute("data-id");
        console.log('data-id:: ', dataId);
        if (this.recordsToUpdate[dataId] == null) {
            this.recordsToUpdate[dataId] = {
                fields : {
                    Id : dataId
                }
            };
        }
        this.recordsToUpdate[dataId].fields[fieldName] = value;
        console.log('recordstoupdate;, ', this.recordsToUpdate);

        /* eslint-disable */
        this.timeoutId = setTimeout(this.updateGenericRecords.bind(this), 500);
    }

    updateGenericRecords() {
        Object.values(this.recordsToUpdate).forEach(record => {
            updateRecord(record)
                .then(() => {
                })
                .catch(error => {
                    console.log('error', error);
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error updating project record',
                            message: error.body.message,
                            variant: 'error',
                        }),
                    );
                });
        });
        this.recordsToUpdate = {};
    }
}