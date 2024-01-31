import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';

import getRecipesWithIngredients from '@salesforce/apex/RecipeIngredientController.getRecipesWithIngredients';
import relateRecipeAndIngredientsToGroceryList from '@salesforce/apex/RecipeIngredientController.relateRecipeAndIngredientsToGroceryList';

export default class RecipeIngredients extends NavigationMixin(LightningElement) {

    @api recordId;
    relatedListIcon = 'custom:custom5';
    newRecipeId;

    @track searchedRecipeName;
    recipeList;
    showNewRecipeModal = false;
    isModalLoaded = true;
    queriedRecipeWithIngredientsData;


    @wire(getRecipesWithIngredients, {param: '$searchedRecipeName'})
    foundRecipes(result) {
        this.queriedRecipeWithIngredientsData = result;
        if (result.data) {
            if(this.searchedRecipeName) {
                this.recipeList = result.data;
            } else {
                this.recipeList = [];
            }
            console.log('found recipes', this.foundRecipes);
            this.error = undefined;
        } else if (result.error) {
            console.log('error', result.error);
            this.recipeList = undefined;
        }
    }

    handleSearchTermChange(event) {
		// Debouncing this method: do not update the reactive property as
		// long as this function is being called within a delay of 300 ms.
		// This is to avoid a very large number of Apex method calls.
		window.clearTimeout(this.delayTimeout);
		const searchTerm = event.target.value;
		// eslint-disable-next-line @lwc/lwc/no-async-operation
		this.delayTimeout = setTimeout(() => {
            console.log('search term change', event);
			this.searchedRecipeName = searchTerm;
		}, 300);
	}

    handleAddRecipe(event) {

        let recipe = event.target.value;
        console.log('added recipe with ingredients', recipe);
        relateRecipeAndIngredientsToGroceryList({addedRecipe: recipe, shoppingListId: this.recordId})
            .then(() => {
                console.log('related recipet to list');
                this.showCustomToast('Recipe Added', null, 'success', 'dismissable');
                this.template.querySelector('c-display-shopping-list-recipes').handleRecipeAddition();
                this.template.querySelector('c-display-shopping-list-ingredients').handleIngredientAddition();
            })
            .catch(error => {
                console.log('error adding recipe', error);
                this.showCustomToast('Woops!', error.body.message, 'error', 'dismissable');
            })
    }

    handleCreateNewRecipe() {
        this.showNewRecipeModal = true;
    }

    closeNewRecipeModal() {
        this.showNewRecipeModal = false;
        this.newRecipeId = null;
        refreshApex(this.queriedRecipeWithIngredientsData);
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

    stopModalSpinner() {
        this.isModalLoaded = true;
    }

    handleSuccess(event) {
        this.newRecipeId = event.detail.id;
        this.showIngredientSearch = true;
        console.log('recipecreatesuccess', event.detail.id);
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: event.detail.id,
                objectApiName:'Recipe__c',
                actionName:'view'
            }
        })
    }

    handleError(error) {
        console.log('createOrOtherError', error);
    }

    handleClearResults() {
        this.searchedRecipeName = '';
        this.recipeList = [];
    }

}