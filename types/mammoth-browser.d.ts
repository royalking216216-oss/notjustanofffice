declare module "mammoth/mammoth.browser" {
  type ConvertResult = { value: string }
  const mammoth: {
    convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>
  }
  export default mammoth
}
