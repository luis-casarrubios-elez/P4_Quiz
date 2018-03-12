
const Sequelize = require('sequelize');

const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require('./model');

/**
 * Muestra la ayuda.
 *
 * @param rl Objeto readLine usado para implementar el CLI.
 */
exports.helpCmd = rl => {
    log("Commandos:");
    log("    h|help - Muestra esta ayuda.");
    log("    list - Listar los quizzes existentes.");
    log("    show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log("    add - Añadir un nuevo quiz interactivamente.");
    log("    delete <id> - Borrar el quiz indicado.");
    log("    edit <id> - Editar el quiz indicado.");
    log("    test <id> - Probar el quiz indicado.");
    log("    p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("    credits - Créditos.");
    log("    q|quit - Salir del programa.");
    rl.prompt();
};

/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readLine usado para implementar el CLI.
 */
exports.listCmd = rl => {

    models.quiz.findAll()
        .each(quiz => {
            log(` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Esta función devuelve una promesa que:
 *  - Valida que se ha introducido un valor para el parámetro.
 *  - Convierte el parámetro en un número entero.
 * Si todo va bien, la promesa se satisface y devuelve el valor de id a usar.
 *
 * @param id Parametro con el índice a validar.
 */
const validateId = id => {

    return new Sequelize.Promise((resolve, reject) => {
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parámetro <id>.`));
        } else {
            id = parseInt(id); //coger la parte entera y descartar lo demás
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parámetro <id> no es un número.`));
            } else {
                resolve(id);
            }
        }
    });
};


/**
 * Lista el quiz indicado por el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readLine usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl, id) => {

    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido.
 * Entonces la llamada a then que hay que hacer la promesa devuelta será:
 *      .then(answer => {...})
 *
 * También colorea en rojo el texto de la pregunta, elimina espacios al principio y final.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param text Pregunta que hay que hacerle al usuario.
 */
const makeQuestion = (rl, text) => {

    return new Sequelize.Promise((resolve, reject)=> {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};



/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y la respuesta.
 *
 * Hay que recordar que el funcionamiento de la función rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readLine usado para implementar el CLI.
 */
exports.addCmd = rl => {

    makeQuestion(rl, 'Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, 'Introduzca la respuesta ')
            .then(a => {
                return {question: q, answer: a};
            });
        })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz)=> {
            log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta' )} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erróneo: ');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Borra un quiz del modelo.
 *
 * @param id Clave del quiz a borrar en el modelo.
 * @param rl Objeto readLine usado para implementar el CLI.
 */
exports.deleteCmd = (rl, id) => {

    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

/**
 * Edita un quiz del modelo.
 *
 * Hay que recordar que el funcionamiento de la función rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en el callback de la segunda
 * llamada a rl.question.
 *
 * @param id Clave del quiz a editar en el modelo.
 * @param rl Objeto readLine usado para implementar el CLI.
 */
exports.editCmd = (rl, id) => {

    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if(!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }

        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
        return makeQuestion(rl, 'Introduzca una pregunta: ')
        .then(q => {
            process.stdout.isTTY && setTimeout (() => {rl.write(quiz.answer)},0);
            return makeQuestion(rl, 'Introduzca la respuesta ')
                .then(a => {
                    quiz.question = q;
                    quiz.answer = a;
                    return quiz;
                });
        });
    })
    .then(quiz => {
        return quiz.save();
    })
    .then(quiz => {
        log(` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erróneo: ');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });

};

/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param id Clave del quiz a probar.
 * @param rl Objeto readLine usado para implementar el CLI.
 */
exports.testCmd = (rl, id) => {
//validar cual es el id
//acceder a la base de datos para obtener

    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            rl.question(colorize(quiz.question + "? ", 'red'), answer => {
                let answerAux = answer.toLowerCase().trim();
                if (answerAux === quiz.answer.toLowerCase().trim()) {
                    log(`Su respuesta es correcta`);
                    biglog('Correcta', 'green');
                    rl.prompt();

                }
                else {
                    log(`Su respuesta es incorrecta`);
                    biglog('Incorrecta', 'red');
                    rl.prompt();

                }
            })
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });

};


/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 * @param rl Objeto readLine usado para implementar el CLI.
 */

//cargar en un array todas las preguntas e ir eliminando segun las preguntamos
//Y orientarlo a promesas.
exports.playCmd = rl => {

    let score = 0;
    //llenar array quiz con las preguntas y respuestas
    models.quiz.findAll()
        .then(quiz => {


            const playOne = () => {

                let maxid = quiz.length;


                if (maxid === 0) {
                    log(`No hay nada más que preguntar`);
                    log(`Fin del juego. Aciertos: ${score}`);
                    biglog(score, 'magenta');
                    rl.prompt();
                } else {
                    let ident = Math.floor(Math.random() * maxid);
                    const quiz0 = quiz[ident]; //Claro, ya he copiado las preguntas en el array, las saco de aquí para el quiz.
                    rl.question(colorize(quiz0.question + "? ", 'red'), answer => {
                        let answerAux = answer.toLowerCase().trim();
                        if (answerAux === quiz0.answer.toLowerCase().trim()) {
                            score += 1;
                            log(`CORRECTO - Lleva ${score} aciertos.`);
                            quiz.splice(ident, 1);
                            playOne();
                        }
                        else {
                            log(`INCORRECTO.`);
                            log(`Fin del juego. Aciertos: ${score}`);
                            biglog(score, 'magenta');
                            rl.prompt();
                        }
                        ;
                    });

                }
                ;
            };


            playOne();
        })
        .then(() => {
            rl.prompt();
        });

};

/**
 * Muestra os nombres de los autores de la práctica.
 *
 * @param rl Objeto readLine usado para implementar el CLI.
 */
exports.creditsCmd = rl => {
    log("Autores de la práctica: ");
    log("Nombre 1: Luis Casarrubios Élez ", 'green');
    log("Nombre 2: Rubén Hernández Rodas ", 'green');
    rl.prompt();
};

/**
 * Terminar el programa.
 *
 * @param rl Objeto readLine usado para implementar el CLI.
 */
exports.quitCmd = rl => {
    rl.close();
};
