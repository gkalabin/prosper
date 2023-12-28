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
import { DB } from "lib/db";
import { TransactionWithExtensions } from "lib/model/AllDatabaseDataModel";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

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
  const db = new DB({ userId });
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
  const result = await prisma.$transaction(async (tx) => {
    const tripId = await maybeCreateTrip(tx, dto, userId);
    if (dto.mode == FormMode.PERSONAL) {
      dbArgs.data.personalExpense = {
        create: personalExpenseDbInput(dto, userId),
      };
      if (tripId) {
        dbArgs.data.personalExpense.create.tripId = tripId;
      }
    }
    if (dto.mode == FormMode.EXTERNAL) {
      dbArgs.data.thirdPartyExpense = {
        create: thirdPartyExpenseDbInput(dto, userId),
      };
      if (tripId) {
        dbArgs.data.thirdPartyExpense.create.tripId = tripId;
      }
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
    return await tx.transaction.create(dbArgs);
  });
  res.json(result);
}

async function maybeCreateTrip(tx, dto: AddTransactionDTO, userId: number) {
  const tripName =
    dto.personalTransaction?.tripName ?? dto.externalTransaction?.tripName;
  if (!tripName) {
    return 0;
  }
  const tripNameAndUser = {
    name: tripName,
    userId,
  };
  const existingTrip = await tx.trip.findFirst({
    where: tripNameAndUser,
  });
  if (existingTrip) {
    return existingTrip.id;
  }
  const newTrip = await tx.trip.create({
    data: tripNameAndUser,
  });
  return newTrip.id;
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
  const result = await prisma.$transaction(async (tx) => {
    const tripId = await maybeCreateTrip(tx, dto, userId);

    if (dto.mode == FormMode.PERSONAL) {
      dbArgs.data.personalExpense = {
        update: personalExpenseDbInput(dto, userId),
      };
      if (tripId) {
        dbArgs.data.personalExpense.create.tripId = tripId;
      }
    }
    if (dto.mode == FormMode.EXTERNAL) {
      dbArgs.data.thirdPartyExpense = {
        update: thirdPartyExpenseDbInput(dto, userId),
      };
      if (tripId) {
        dbArgs.data.thirdPartyExpense.create.tripId = tripId;
      }
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

    return await tx.transaction.update(dbArgs);
  });
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
  const whereTransactionId = {
    where: {
      transactionId: dto.transactionId,
    },
  };

  const result = await prisma.$transaction(async (tx) => {
    if (existing.personalExpense) {
      await tx.personalExpense.delete(whereTransactionId);
    }
    if (existing.thirdPartyExpense) {
      await tx.thirdPartyExpense.delete(whereTransactionId);
    }
    if (existing.transfer) {
      await tx.transfer.delete(whereTransactionId);
    }
    if (existing.income) {
      await tx.income.delete(whereTransactionId);
    }

    const tripId = await maybeCreateTrip(tx, dto, userId);
    if (dto.mode == FormMode.PERSONAL) {
      dbArgs.data.personalExpense = {
        create: personalExpenseDbInput(dto, userId),
      };
      if (tripId) {
        dbArgs.data.personalExpense.create.tripId = tripId;
      }
    }
    if (dto.mode == FormMode.EXTERNAL) {
      dbArgs.data.thirdPartyExpense = {
        create: thirdPartyExpenseDbInput(dto, userId),
      };
      if (tripId) {
        dbArgs.data.thirdPartyExpense.create.tripId = tripId;
      }
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
    return await tx.transaction.update(dbArgs);
  });

  res.json(result);
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
