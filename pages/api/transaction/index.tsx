import { Prisma } from "@prisma/client";
import {
  AddTransactionDTO,
  FormMode,
  incomeDbInput,
  personalExpenseDbInput,
  thirdPartyExpenseDbInput,
  transactionDbInput,
  transferDbInput
} from "lib/AddTransactionDataModels";
import prisma from "lib/prisma";
import { TransactionWithExtensions } from "lib/ServerSideDB";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method != "POST") {
    res
      .status(400)
      .send(`HTTP ${req.method} method is not supported at this route`);
    return;
  }
  const dto = req.body as AddTransactionDTO;

  if (dto.transactionId) {
    handleUpdate(req, res);
    return;
  }

  const dbArgs: Prisma.TransactionCreateArgs = {
    data: transactionDbInput(dto),
    include: {
      personalExpense: true,
      thirdPartyExpense: true,
      transfer: true,
      income: true,
    },
  };
  if (dto.mode == FormMode.PERSONAL) {
    dbArgs.data.personalExpense = {
      create: personalExpenseDbInput(dto),
    };
  }
  if (dto.mode == FormMode.EXTERNAL) {
    dbArgs.data.thirdPartyExpense = {
      create: thirdPartyExpenseDbInput(dto),
    };
  }
  if (dto.mode == FormMode.TRANSFER) {
    dbArgs.data.transfer = {
      create: transferDbInput(dto),
    };
  }
  if (dto.mode == FormMode.INCOME) {
    dbArgs.data.income = {
      create: incomeDbInput(dto),
    };
  }
  const result = await prisma.transaction.create(dbArgs);
  res.json(result);
}

async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
  const dto = req.body as AddTransactionDTO;
  const existing = await prisma.transaction.findFirstOrThrow({
    where: {
      id: dto.transactionId,
    },
    include: {
      personalExpense: true,
      thirdPartyExpense: true,
      income: true,
      transfer: true,
    },
  });
  if (sameExtension(existing, dto)) {
    const dbArgs: Prisma.TransactionUpdateArgs = {
      data: transactionDbInput(dto),
      where: {
        id: dto.transactionId,
      },
      include: {
        personalExpense: true,
        thirdPartyExpense: true,
        transfer: true,
        income: true,
      },
    };
    if (dto.mode == FormMode.PERSONAL) {
      dbArgs.data.personalExpense = {
        update: personalExpenseDbInput(dto),
      };
    }
    if (dto.mode == FormMode.EXTERNAL) {
      dbArgs.data.thirdPartyExpense = {
        update: thirdPartyExpenseDbInput(dto),
      };
    }
    if (dto.mode == FormMode.TRANSFER) {
      dbArgs.data.transfer = {
        update: transferDbInput(dto),
      };
    }
    if (dto.mode == FormMode.INCOME) {
      dbArgs.data.income = {
        update: incomeDbInput(dto),
      };
    }
    const result = await prisma.transaction.update(dbArgs);
    res.json(result);
    return;
  }
}

function sameExtension(
  existing: TransactionWithExtensions,
  newData: AddTransactionDTO
) {
  return (
    (existing.personalExpense && newData.personalTransaction) ||
    (existing.thirdPartyExpense && newData.externalTransaction) ||
    (existing.income && newData.incomeTransaction) ||
    (existing.transfer && newData.transferTransaction)
  );
}
