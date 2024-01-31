public with sharing class GoldStarServices {

    public static final Integer ACCEPTABLE_DRINKS = 7;

    public static void generateWeeklyGoldStars() {
        try {
            DateTime nowDateTime = DateTime.now();
            DateTime endTime = DateTime.newInstance(nowDateTime.year(), nowDateTime.month(), nowDateTime.day(), 0, 0, 0);
            DateTime startTime = endTime.addDays(-7);
            
            List<Drink__c> weeklyDrinks = [SELECT Id, CreatedById FROM Drink__c WHERE CreatedDate > :startTime AND CreatedDate <= :endTime];
            List<Exercise__c> weeklyExercise = [SELECT Id, CreatedById FROM Exercise__c WHERE CreatedDate > :startTime AND CreatedDate <= :endTime];
            List<Behavior__c> weeklyBehaviors = [
                SELECT Id, Star_Value__c, CreatedById, Behavior_Type__r.Name
                FROM Behavior__c
                WHERE Calculation_Timeframe__c = 'Weekly'
                    AND CreatedDate > :startTime
                    AND CreatedDate <= :endTime
            ];
    
            Map<String,List<Drink__c>> userToDrinks = new Map<String,List<Drink__c>>();
            for (Drink__c drink : weeklyDrinks) {
                if (userToDrinks.get(drink.CreatedById) == null) {
                    userToDrinks.put(drink.CreatedById, new List<Drink__c>{drink});
                } else {
                    userToDrinks.get(drink.CreatedById).add(drink);
                }
            }
    
            Map<String,List<Exercise__c>> userToExercise = new Map<String,List<Exercise__c>>();
            for (Exercise__c exercise : weeklyExercise) {
                if (userToExercise.get(exercise.CreatedById) == null) {
                    userToExercise.put(exercise.CreatedById, new List<Exercise__c>{exercise});
                } else {
                    userToExercise.get(exercise.CreatedById).add(exercise);
                }
            }
    
            Map<String,List<Behavior__c>> userToBehavior = new Map<String,List<Behavior__c>>();
            for (Behavior__c behavior : weeklyBehaviors) {
                if (userToBehavior.get(behavior.CreatedById) == null) {
                    userToBehavior.put(behavior.CreatedById, new List<Behavior__c>{behavior});
                } else {
                    userToBehavior.get(behavior.CreatedById).add(behavior);
                }
            }
    
            List<Gold_Star_Tracking__c> trackers = [SELECT Id, OwnerId FROM Gold_Star_Tracking__c];
            Map<String,String> userToTracker = new Map<String,String>();
            for (Gold_Star_Tracking__c tracker : trackers) {
                if (userToTracker.get(tracker.OwnerId) == null) {
                    userToTracker.put(tracker.OwnerId, tracker.Id);
                } else {
                    throw new GoldStarServicesException('Multiple Trackers owned by single user with the following Id: ' + tracker.OwnerId);
                }
            }

            List<Gold_Star__c> starsToCreate = new List<Gold_Star__c>();
            for (List<Drink__c> userDrinkList : userToDrinks.values()) {
                if (userToTracker.get(userDrinkList[0].CreatedById) == null) {
                    // create error log
                    continue;
                }
                Gold_Star__c goldStar = new Gold_Star__c(
                    Gold_Star_Tracking__c = userToTracker.get(userDrinkList[0].CreatedById),
                    Reason__c = 'Good Drinking Habits'    
                );
                Decimal difference = ACCEPTABLE_DRINKS - userDrinkList.size();
                if (difference >= 3) {
                    goldStar.Value__c = 3;
                } else if (difference < -3) {
                    goldStar.Value__c = difference + 2;
                    goldStar.Reason__c = 'Bad Drinking Habits';
                } else if (difference > 0) {
                    goldStar.Value__c = difference;
                } else {
                    continue;
                }
                starsToCreate.add(goldStar);
            }

            for (List<Exercise__c> userExerciseList : userToExercise.values()) {
                if (userToTracker.get(userExerciseList[0].CreatedById) == null) {
                    // create error log
                    continue;
                }
                Gold_Star__c goldStar = new Gold_Star__c(
                    Gold_Star_Tracking__c = userToTracker.get(userExerciseList[0].CreatedById),
                    Reason__c = 'Exercise'
                );
                Integer exercises = userExerciseList.size();
                if (exercises >= 4) {
                    goldStar.Value__c = 3;
                } else if (exercises == 3) {
                    goldStar.Value__c = 2;
                } else if (exercises == 2) {
                    goldStar.Value__c = 1;
                } else {
                    continue;
                }
                starsToCreate.add(goldstar);
            }

            for (List<Behavior__c> userBehaviors : userToBehavior.values()) {
                for (Behavior__c behavior : userBehaviors) {
                    if (userToTracker.get(behavior.CreatedById) == null) {
                        continue;
                    } else {
                        starsToCreate.add(new Gold_Star__c(
                            Gold_Star_Tracking__c = userToTracker.get(behavior.CreatedById),
                            Value__c = behavior.Star_Value__c,
                            Reason__c = behavior.Behavior_Type__r.Name
                        ));
                    }
                }
            }

            insert starsToCreate;
        } catch (Exception e) {
            System.debug('Error Message: ' + e.getMessage());
            System.debug('Error Stack Trace: ' + e.getStackTraceString());
            insert new Error_Log__c(Message__c = e.getMessage(), Stack_Trace__c = e.getStackTraceString());
        }

    }

    public static void generateMonthlyGoldStars() {
        try {
            DateTime nowDateTime = DateTime.now();
            DateTime endTime = DateTime.newInstance(nowDateTime.year(), nowDateTime.month(), nowDateTime.day(), 0, 0, 0);
            DateTime startTime = endTime.addMonths(-1);

            List<Behavior__c> monthlyBehaviors = [
                SELECT Id, Star_Value__c, CreatedById, Behavior_Type__r.Name
                FROM Behavior__c
                WHERE Calculation_Timeframe__c = 'Monthly'
                    AND CreatedDate > :startTime
                    AND CreatedDate <= :endTime
            ];

            List<Gold_Star_Tracking__c> trackers = [SELECT Id, OwnerId FROM Gold_Star_Tracking__c];
            Map<String,String> userToTracker = new Map<String,String>();
            for (Gold_Star_Tracking__c tracker : trackers) {
                if (userToTracker.get(tracker.OwnerId) == null) {
                    userToTracker.put(tracker.OwnerId, tracker.Id);
                } else {
                    throw new GoldStarServicesException('Multiple Trackers owned by single user with the following Id: ' + tracker.OwnerId);
                }
            }

            List<Gold_Star__c> starsToCreate = new List<Gold_Star__c>();
            for (Behavior__c behavior : monthlyBehaviors) {
                if (userToTracker.get(behavior.CreatedById) == null) {
                    continue;
                } else {
                    starsToCreate.add(new Gold_Star__c(
                        Gold_Star_Tracking__c = userToTracker.get(behavior.CreatedById),
                        Value__c = behavior.Star_Value__c,
                        Reason__c = behavior.Behavior_Type__r.Name
                    ));
                }
            }

            insert starsToCreate;
        } catch (Exception e) {
            System.debug('Error Message: ' + e.getMessage());
            System.debug('Error Stack Trace: ' + e.getStackTraceString());
            insert new Error_Log__c(Message__c = e.getMessage(), Stack_Trace__c = e.getStackTraceString());
        }
    }

    public class GoldStarServicesException extends Exception {}
}
