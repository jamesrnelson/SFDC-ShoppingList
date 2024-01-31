global class ScheduleGoldStarCalculation implements Schedulable {
    global Boolean weekly;

    global ScheduleGoldStarCalculation(Boolean weekly) {
        this.weekly = weekly;
    }

    global static void scheduleGoldStarCalculations() {
        System.schedule('Weekly Calculation', '0 0 0 ? * MON', new ScheduleGoldStarCalculation(true));
        System.schedule('Monthly Calculation', '0 0 0 1 * ?', new ScheduleGoldStarCalculation(false));
    }

    global void execute(SchedulableContext sc) {
        if (this.weekly) {
            GoldStarServices.generateWeeklyGoldStars();
        } else {
            GoldStarServices.generateMonthlyGoldStars();
        } 
    }
}
