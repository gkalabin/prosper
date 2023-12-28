import { Prisma } from "@prisma/client";
import {
  AddTransactionDTO,
  FormMode,
  incomeDbInput,
  personalExpenseDbInput,
  thirdPartyExpenseDbInput,
  transactionDbInput,
  transferDbInput,
} from "lib/AddTransactionDataModels";
import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import { TransactionWithExtensions } from "lib/model/AllDatabaseDataModel";
import type { NextApiRequest, NextApiResponse } from "next";
import { DB } from "lib/db";

const includeExtensions = {
  include: {
    personalExpense: true,
    thirdPartyExpense: true,
    transfer: true,
    income: true,
  },
};

const whereId = (id: number) => {
  return { where: { id } };
};

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const dto = req.body as AddTransactionDTO;
  if (!dto.transactionId) {
    await handleCreate(dto, res, userId);
    return;
  }
  const db = new DB({userId});
  const existing = await db.transactionFindFirst(
    Object.assign(whereId(dto.transactionId), includeExtensions)
  );
  if (!existing) {
    res.status(404).send(`Transaction not found`);
    return;
  }
  if (sameExtension(existing, dto)) {
    updateWithSameExtension(dto, res, userId);
    return;
  }
  updateAndRecreateExtension(dto, existing, res, userId);
}

async function handleCreate(
  dto: AddTransactionDTO,
  res: NextApiResponse<TransactionWithExtensions>,
  userId: number
) {
  const dbArgs: Prisma.TransactionCreateArgs = Object.assign(
    {
      data: transactionDbInput(dto, userId),
    },
    includeExtensions
  );
  if (dto.mode == FormMode.PERSONAL) {
    dbArgs.data.personalExpense = {
      create: personalExpenseDbInput(dto, userId),
    };
  }
  if (dto.mode == FormMode.EXTERNAL) {
    dbArgs.data.thirdPartyExpense = {
      create: thirdPartyExpenseDbInput(dto, userId),
    };
  }
  if (dto.mode == FormMode.TRANSFER) {
    dbArgs.data.transfer = {
      create: transferDbInput(dto, userId),
    };
  }
  if (dto.mode == FormMode.INCOME) {
    dbArgs.data.income = {
      create: incomeDbInput(dto, userId),
    };
  }
  const result = await prisma.transaction.create(dbArgs);
  res.json(result);
}

async function updateWithSameExtension(
  dto: AddTransactionDTO,
  res: NextApiResponse<TransactionWithExtensions>,
  userId: number
) {
  const dbArgs: Prisma.TransactionUpdateArgs = Object.assign(
    {
      data: transactionDbInput(dto, userId),
    },
    whereId(dto.transactionId),
    includeExtensions
  );
  if (dto.mode == FormMode.PERSONAL) {
    dbArgs.data.personalExpense = {
      update: personalExpenseDbInput(dto, userId),
    };
  }
  if (dto.mode == FormMode.EXTERNAL) {
    dbArgs.data.thirdPartyExpense = {
      update: thirdPartyExpenseDbInput(dto, userId),
    };
  }
  if (dto.mode == FormMode.TRANSFER) {
    dbArgs.data.transfer = {
      update: transferDbInput(dto, userId),
    };
  }
  if (dto.mode == FormMode.INCOME) {
    dbArgs.data.income = {
      update: incomeDbInput(dto, userId),
    };
  }
  const result = await prisma.transaction.update(dbArgs);
  res.json(result);
}

async function updateAndRecreateExtension(
  dto: AddTransactionDTO,
  existing: TransactionWithExtensions,
  res: NextApiResponse<TransactionWithExtensions>,
  userId: number
) {
  const dbArgs: Prisma.TransactionUpdateArgs = Object.assign(
    {
      data: transactionDbInput(dto, userId),
    },
    whereId(dto.transactionId),
    includeExtensions
  );
  const transactionConnect = {
    transaction: {
      connect: {
        id: dto.transactionId,
      },
    },
  };
  let createNewExtension;
  if (dto.mode == FormMode.PERSONAL) {
    createNewExtension = prisma.personalExpense.create({
      data: Object.assign(
        personalExpenseDbInput(dto, userId),
        transactionConnect
      ),
    });
  }
  if (dto.mode == FormMode.EXTERNAL) {
    createNewExtension = prisma.thirdPartyExpense.create({
      data: Object.assign(
        thirdPartyExpenseDbInput(dto, userId),
        transactionConnect
      ),
    });
  }
  if (dto.mode == FormMode.TRANSFER) {
    createNewExtension = prisma.transfer.create({
      data: Object.assign(transferDbInput(dto, userId), transactionConnect),
    });
  }
  if (dto.mode == FormMode.INCOME) {
    createNewExtension = prisma.income.create({
      data: Object.assign(incomeDbInput(dto, userId), transactionConnect),
    });
  }
  const whereTransactionId = {
    where: {
      transactionId: dto.transactionId,
    },
  };
  let deleteOldExtension;
  if (existing.personalExpense) {
    deleteOldExtension = prisma.personalExpense.delete(whereTransactionId);
  }
  if (existing.thirdPartyExpense) {
    deleteOldExtension = prisma.thirdPartyExpense.delete(whereTransactionId);
  }
  if (existing.transfer) {
    deleteOldExtension = prisma.transfer.delete(whereTransactionId);
  }
  if (existing.income) {
    deleteOldExtension = prisma.income.delete(whereTransactionId);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_unused1, _unused2, updatedTransaction] = await prisma.$transaction([
    deleteOldExtension,
    createNewExtension,
    prisma.transaction.update(dbArgs),
  ]);
  res.json(updatedTransaction);
}

function sameExtension(
  oldData: TransactionWithExtensions,
  newData: AddTransactionDTO
) {
  return (
    (oldData.personalExpense && newData.personalTransaction) ||
    (oldData.thirdPartyExpense && newData.externalTransaction) ||
    (oldData.income && newData.incomeTransaction) ||
    (oldData.transfer && newData.transferTransaction)
  );
}

export default authenticatedApiRoute("POST", handle);
