import { ensureDBConnection } from "../../../lib/mongodb";
import User from "../models/User";

/**
 * Server-side service for managing user credits
 */
export class CreditsServiceServer {
  /**
   * Deducts credits from user account
   * @param userId - User ID
   * @param amount - Amount of credits to deduct
   * @returns Promise<boolean> - true if successful, false if insufficient credits
   */
  static async deductCredits(userId: string, amount: number): Promise<boolean> {
    try {
      await ensureDBConnection();

      // Find user and check current credits
      const user = await User.findById(userId);
      if (!user) {
        console.error("❌ CreditsService: User not found:", userId);
        return false;
      }

      const currentCredits = user.credits ?? 0;

      // Check if user has enough credits
      if (currentCredits < amount) {
        console.warn("⚠️ CreditsService: Insufficient credits:", {
          userId,
          currentCredits,
          requestedAmount: amount,
        });
        return false;
      }

      // Deduct credits
      const newCredits = currentCredits - amount;
      await User.findByIdAndUpdate(userId, { credits: newCredits });

      console.log("✅ CreditsService: Credits deducted successfully:", {
        userId,
        previousCredits: currentCredits,
        deductedAmount: amount,
        newCredits,
      });

      return true;
    } catch (error) {
      console.error("❌ CreditsService: Error deducting credits:", error);
      return false;
    }
  }

  /**
   * Adds credits to user account
   * @param userId - User ID
   * @param amount - Amount of credits to add
   * @returns Promise<boolean> - true if successful
   */
  static async addCredits(userId: string, amount: number): Promise<boolean> {
    try {
      await ensureDBConnection();

      const user = await User.findById(userId);
      if (!user) {
        console.error("❌ CreditsService: User not found:", userId);
        return false;
      }

      const currentCredits = user.credits ?? 0;
      const newCredits = currentCredits + amount;

      await User.findByIdAndUpdate(userId, { credits: newCredits });

      console.log("✅ CreditsService: Credits added successfully:", {
        userId,
        previousCredits: currentCredits,
        addedAmount: amount,
        newCredits,
      });

      return true;
    } catch (error) {
      console.error("❌ CreditsService: Error adding credits:", error);
      return false;
    }
  }

  /**
   * Gets user's current credits
   * @param userId - User ID
   * @returns Promise<number> - current credits amount
   */
  static async getUserCredits(userId: string): Promise<number> {
    try {
      await ensureDBConnection();

      const user = await User.findById(userId).select("credits");
      if (!user) {
        console.error("❌ CreditsService: User not found:", userId);
        return 0;
      }

      return user.credits ?? 0;
    } catch (error) {
      console.error("❌ CreditsService: Error getting user credits:", error);
      return 0;
    }
  }

  /**
   * Checks if user has enough credits for operation
   * @param userId - User ID
   * @param requiredAmount - Required credits amount
   * @returns Promise<boolean> - true if user has enough credits
   */
  static async hasEnoughCredits(userId: string, requiredAmount: number): Promise<boolean> {
    const currentCredits = await this.getUserCredits(userId);
    return currentCredits >= requiredAmount;
  }

  /**
   * Handles credit refunds based on status changes
   * @param userId - User ID
   * @param oldStatus - Previous status
   * @param newStatus - New status
   * @returns Promise<boolean> - true if refund was processed
   */
  static async handleStatusChangeRefund(
    userId: string,
    oldStatus: string | undefined,
    newStatus: string | undefined
  ): Promise<boolean> {
    try {
      // Only refund if status changed from "progress" to "error"
      if (oldStatus === "inProgress" && newStatus === "error") {
        console.log("💰 CreditsService: Status changed from progress to error, refunding 1 credit to user:", userId);
        const creditsRefunded = await this.addCredits(userId, 1);
        if (creditsRefunded) {
          console.log("✅ CreditsService: Credits refunded successfully");
          return true;
        } else {
          console.error("❌ CreditsService: Failed to refund credits");
          return false;
        }
      }

      // No refund needed
      return false;
    } catch (error) {
      console.error("❌ CreditsService: Error handling status change refund:", error);
      return false;
    }
  }

  /**
   * Sets user's credits to specific amount
   * @param userId - User ID
   * @param amount - New credits amount
   * @returns Promise<boolean> - true if successful
   */
  static async setCredits(userId: string, amount: number): Promise<boolean> {
    try {
      await ensureDBConnection();

      await User.findByIdAndUpdate(userId, { credits: amount });

      console.log("✅ CreditsService: Credits set successfully:", {
        userId,
        newCredits: amount,
      });

      return true;
    } catch (error) {
      console.error("❌ CreditsService: Error setting credits:", error);
      return false;
    }
  }
}
