
// Sample TypeScript file
interface TestInterface {
  name: string;
  age: number;
}

function typescriptFunction(param: string): string {
  return param.toUpperCase();
}

class TypescriptClass {
  private value: number;
  
  constructor(value: number) {
    this.value = value;
  }
  
  getValue(): number {
    return this.value;
  }
}
