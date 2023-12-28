type AddTransactionInput = {
    vendor?: string;
    description: string;
    timestamp: Date;
    amountCents: number;
    ownShareAmountCents?: number;
    categoryId: number;
    fromBankAccountId?: number;
    toBankAccountId?: number;
};


export default AddTransactionInput;
