import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getRecipeIngredients from '@salesforce/apex/RecipeIngredientController.getRecipeIngredients';

export default class DisplayRecipeIngredients extends LightningElement {
    @api recordId;
    addedIngredients;
    addedIngredientsData;

    @wire(getRecipeIngredients, {recipeId : '$recordId'})
    recipeIngredients(result) {
        this.addedIngredientsData = result;
        if (result.data) {
            this.addedIngredients = result.data;
            console.log('recipe ingredients', this.addedIngredients);
            this.error = undefined;
        } else if (result.error) {
            this.error = error;
            console.log('display recipe Ingredients error', error);
            this.addedIngredients = undefined;
        }
    }

    @api handleIngredientAddition() {
        console.log('in the child apex');
        refreshApex(this.addedIngredientsData);
    }
}