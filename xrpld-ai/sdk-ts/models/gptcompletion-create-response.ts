/* tslint:disable */
/* eslint-disable */
/**
 * XRPL GPT Api
 * No description provided (generated by Swagger Codegen https://github.com/swagger-api/swagger-codegen)
 *
 * OpenAPI spec version: 0.0.9-beta.1
 * Contact: dangell@transia.co
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */
/**
 * 
 * @export
 * @interface GPTCompletionCreateResponse
 */
export interface GPTCompletionCreateResponse {
    /**
     * 
     * @type {string}
     * @memberof GPTCompletionCreateResponse
     */
    question: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof GPTCompletionCreateResponse
     */
    chatHistory: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof GPTCompletionCreateResponse
     */
    answer: string;
}
