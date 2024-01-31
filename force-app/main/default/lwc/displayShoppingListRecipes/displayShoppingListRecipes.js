import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getShoppingListRecipes from '@salesforce/apex/RecipeIngredientController.getShoppingListRecipes';

export default class DisplayShoppingListRecipes extends LightningElement {
    @api recordId;
    addedRecipes;
    addedRecipesData;
    displayQueriedIngredients;

    @wire(getShoppingListRecipes, {shoppingListId : '$recordId'})
    shoppingListRecipes(result) {
        this.addedRecipesData = result;
        if (result.data) {
            this.addedRecipes = result.data;
            console.log('added recipes', this.addedRecipes);
            this.error = undefined;
        } else if (result.error) {
            this.error = error;
            console.log('error', error);
            this.addedRecipes = undefined;
        }
    }

    @api handleRecipeAddition() {
        console.log('in the child apex');
        refreshApex(this.addedRecipesData);
    }
}