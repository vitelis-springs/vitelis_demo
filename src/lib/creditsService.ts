import type {User, UserCreditsInfo} from "../hooks/api/useUsersService";

/**
 * Service for working with user credits
 */
export class CreditsService {
    /**
     * Checks if credits information should be displayed based on API response
     * @param creditsInfo - credits information from API
     * @returns true if credits should be displayed, false otherwise
     */
    static shouldDisplayCreditsFromApi(creditsInfo: UserCreditsInfo | null | undefined): boolean {
        if (!creditsInfo) {
            return false;
        }

        return creditsInfo.shouldDisplayCredits;
    }

    /**
     * Gets user credits amount from API response
     * @param creditsInfo - credits information from API
     * @returns credits amount or 0 if not defined
     */
    static getUserCreditsFromApi(creditsInfo: UserCreditsInfo | null | undefined): number {
        if (!creditsInfo) {
            return 0;
        }

        return creditsInfo.currentCredits;
    }

    /**
     * Formats credits amount for display
     * @param credits - credits amount
     * @returns formatted string
     */
    static formatCredits(credits: number): string {
        return credits.toString();
    }


    /**
     * Checks if user has enough credits for operation based on API response
     * @param creditsInfo - credits information from API
     * @param requiredCredits - required credits amount
     * @returns true if user has enough credits, false otherwise
     */
    static hasEnoughCreditsFromApi(creditsInfo: UserCreditsInfo | null | undefined, requiredCredits: number): boolean {
        const userCredits = this.getUserCreditsFromApi(creditsInfo);
        return userCredits >= requiredCredits;
    }
}
