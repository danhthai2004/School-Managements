/**
 * Helper function to extract error message from Axios errors
 * Avoids using 'any' type while maintaining type safety
 */
export function extractErrorMessage(error: unknown, defaultMessage = "Đã có lỗi xảy ra"): string {
  if (typeof error === "object" && error !== null) {
    // Check for Axios error structure
    if ("response" in error) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError?.response?.data?.message;
      if (message && typeof message === "string") {
        return message;
      }
    }
    
    // Check for standard Error object
    if ("message" in error) {
      const stdError = error as { message?: string };
      if (stdError.message && typeof stdError.message === "string") {
        return stdError.message;
      }
    }
  }
  
  return defaultMessage;
}
