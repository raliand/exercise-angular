/**
 * Calculates the age based on a date of birth string (YYYY-MM-DD).
 * @param dobString The date of birth string in YYYY-MM-DD format.
 * @returns The calculated age in years, or 0 if the input is invalid.
 */
export function calculateAge(dobString: string): number {
    if (!dobString) {
        return 0;
    }
    try {
        const birthDate = new Date(dobString);
        // Check if the date is valid
        if (isNaN(birthDate.getTime())) {
            return 0;
        }

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age > 0 ? age : 0; // Return 0 if age is negative (e.g., future DOB)
    } catch (e) {
        console.error("Error calculating age:", e);
        return 0;
    }
}
