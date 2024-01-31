import { api } from 'lwc';
import LightningModal from 'lightning/modal';

export default class ShoppingListIngredientModal extends LightningModal {

    @api recordId;
    @api createOrEdit;

}