/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/**
 * See {@link PromiseUtil.consolidateCall}.
 */
export class PromiseUtil {
  private static _activeConsolidators = new Map<string, Promise<any>>();

  /**
   * Calls the given async function if it is not already in the process of being called. If it is in the process of
   * being called, returns the result from the previous call.
   * @param key Key used to identify the call being consolidated. Each place that calls this function should use a
   * unique key. If the call should only be consolidated based on other input, that should also be included in the key.
   * @param call Asynchronous function to consolidate.
   * @returns The return value from the consolidated function call.
   */
  public static async consolidateCall<T>(key: string, call: () => Promise<T>): Promise<T> {
    const activePromise = PromiseUtil._activeConsolidators.get(key);
    // Are we already busy performing this call?
    if (activePromise) {
      // Wait for previous call to complete, then return the result from that call. Note that it is
      // possible for the promise below to throw an error. If that happens, it will be the error that was
      // thrown by the consolidated call, so we want to allow it to be thrown.
      return activePromise;
    }
    const promiseResult = new Promise<T>(async (resolve, reject) => {
      try {
        const result = await call();
        resolve(result);
      } catch (error) {
        reject(error as Error);
      } finally {
        PromiseUtil._activeConsolidators.delete(key);
      }
    });
    PromiseUtil._activeConsolidators.set(key, promiseResult);
    return promiseResult;
  }
}
