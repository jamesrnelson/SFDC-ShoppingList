import { LightningElement } from 'lwc';
import getShoppingLists from '@salesforce/apex/RecipeIngredientController.getMostRecentShoppingLists';

export default class ShoppingListNavigator extends LightningElement {

    shoppingLists;
    selectedRecordId;

    connectedCallback() {
        getShoppingLists()
        .then(result => {
            this.shoppingLists = result;
            this.selectedRecordId = this.shoppingLists[0].Id;
        })
        .catch(error => {
            console.log('error', error);
        })
    }

    handleShoppingListClick(event) {
        this.selectedRecordId = this.template.querySelector('select.shoppinglist').value;

        console.log('button clicked');
        console.log('event.target.value', event.target.value);
        console.log('shoppingLists', this.shoppingLists);
    }
}