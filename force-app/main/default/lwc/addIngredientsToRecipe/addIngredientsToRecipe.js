import { LightningElement, track, wire, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getSearchedIngredients from '@salesforce/apex/RecipeIngredientController.getSearchedIngredients';
import getPicklistValues from '@salesforce/apex/RecipeIngredientController.getFieldPicklistValues';
import createIngredient from '@salesforce/apex/RecipeIngredientController.createIngredient';
import createRecipeIngredient from '@salesforce/apex/RecipeIngredientController.createRecipeIngredient';

export default class AddIngredientsToRecipe extends LightningElement {
    
    @api recordId;
    
    @track searchedIngredientName;

    ingredientList = [];
    options;
    displayCreateButton;
    draftValues = {};
    searchParam;


    connectedCallback() {
        getPicklistValues({objectApiName: 'Recipe_Ingredient__c', fieldApiName: 'Measurement__c'})
            .then(result => {
                this.options = result;
            })
            .catch(error => {
                console.log('error getting picklist values', error);
            })
    }

    @wire(getSearchedIngredients, {param: '$searchedIngredientName'})
    foundIngredients(result) {
        this.queriedIngredientData = result
        if (result.data) {
            if(this.searchedIngredientName) {
                this.ingredientList = result.data;
            } else {
                this.ingredientList = [];
            }
            let ingredientSize = Object.keys(this.ingredientList).length;
            if(ingredientSize === 0 && this.searchedIngredientName) {
                this.displayCreateButton = true;
                this.labelDisplay = `Create new ingredient: '${this.searchedIngredientName}'`;
            } else {
                this.displayCreateButton = false;
            }
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            console.log('error', error);
            this.ingredientList = undefined;
        }
    }

    handleQuantityChange(event) {
        const dataId = event.target.name;
        const fieldName = 'Quantity__c';
        const value = event.target.value;
        this.updateDraftValues(dataId, fieldName, value);
    }
    
    handleMeasurementChange(event) {
        const dataId = event.target.name;
        const fieldName = 'Measurement__c';
        const value = event.target.value;
        this.updateDraftValues(dataId, fieldName, value);
    }

    updateDraftValues(dataId, fieldName, value) {
        if (this.draftValues[dataId] == null) {
            this.draftValues[dataId] = {};
        }
        if (this.draftValues[dataId][fieldName] == null) {
            this.draftValues[dataId][fieldName] = {};
        }
        this.draftValues[dataId][fieldName] = value;
        console.log("draft values", this.draftValues);
    }

    handleCreateIngredient() {
        createIngredient({ingredientName: this.searchedIngredientName})
            .then(result => {
                refreshApex(this.queriedIngredientData);

            })
            .catch(error => {
                console.log('error', error);
            })
    }

    handleSearchTermChange(event) {
		// Debouncing this method: do not update the reactive property as
		// long as this function is being called within a delay of 300 ms.
		// This is to avoid a very large number of Apex method calls.
		window.clearTimeout(this.delayTimeout);
		const searchTerm = event.target.value;
		// eslint-disable-next-line @lwc/lwc/no-async-operation
		this.delayTimeout = setTimeout(() => {
			this.searchedIngredientName = searchTerm;
		}, 300);
	}

    handleAddIngredient(event) {
        const ingredientId = event.target.value;
        const recipeId = this.recordId;
        const recipeIngredient = {
            Recipe__c: recipeId,
            Ingredient__c: ingredientId,
            Quantity__c: this.draftValues[ingredientId]['Quantity__c'],
            Measurement__c: this.draftValues[ingredientId]['Measurement__c']
        }
        createRecipeIngredient({recipeIngredient: recipeIngredient})
            .then(() => {
                this.showCustomToast('Added ingredient to recipe', null, 'success', 'dismissable');
                this.template.querySelector('c-display-recipe-ingredients').handleIngredientAddition();
            })
            .catch(error => {
                console.log('error creating recipe Ingredient.', error);
            })
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

    @api updateRecipeId(newId) {
        this.recordId = newId;
    }

    handleClearResults() {
        this.searchedIngredientName = '';
        this.ingredientList = [];
    }
}