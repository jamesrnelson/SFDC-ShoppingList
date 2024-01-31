global with sharing class ScheduleShoppingListIngredientCleanup implements Schedulable{

    global ScheduleShoppingListIngredientCleanup() {

    }

    global static void scheduleJob() {
        System.schedule('Weekly Ingredient Calculation', '0 0 0 ? * MON', new ScheduleShoppingListIngredientCleanup());
    }

    global void execute(SchedulableContext sc) {
        ShoppingListIngredientService.cleanUpShoppingListIngredients();
    }
}