using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TODO.Backend.API.Controllers;
using TODO.Database.AccessLayer.Services;
using TODO.Database.Models.Core;
using TODO.Database.Models.Static;

namespace Test.TODO.Backed.API.Controllers;

[TestFixture]
public class TODOListControllerTests
{
    private Mock<ITODOListService> _serviceMock = null!;
    private TODOListController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        _serviceMock = new Mock<ITODOListService>(MockBehavior.Strict);
        _controller = new TODOListController(
            _serviceMock.Object,
            NullLogger<TODOListController>.Instance);
    }

    private static TODOList CreateTodo(
        string title = "Buy groceries",
        bool isCompleted = false) => new()
    {
        Title = title,
        Description = "Buy milk and coffee",
        Category = Category.Shopping,
        Priority = Priority.High,
        IsCompleted = isCompleted
    };

    private static string GetResponseProperty(IActionResult result, string propertyName)
    {
        var objectResult = (ObjectResult)result;
        var property = objectResult.Value!.GetType().GetProperty(propertyName);

        return (string)property!.GetValue(objectResult.Value)!;
    }

    #region Get All / Get Item
    // Verifies that all service items are returned in a successful response.
    [Test]
    public void Get_ItemsExist_ReturnsOkWithItems()
    {
        // Arrange
        var todos = new[] { CreateTodo(), CreateTodo("Submit report") };
        _serviceMock.Setup(service => service.GetAll()).Returns(todos);

        // Act
        var result = _controller.Get();

        // Assert
        var okResult = result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);
        Assert.That(okResult!.Value, Is.SameAs(todos));
        _serviceMock.Verify(service => service.GetAll(), Times.Once);
    }

    // Verifies that an empty TODO collection is still a valid successful response.
    [Test]
    public void Get_NoItems_ReturnsOkWithEmptyCollection()
    {
        // Arrange
        var todos = Array.Empty<TODOList>();
        _serviceMock.Setup(service => service.GetAll()).Returns(todos);

        // Act
        var result = _controller.Get();

        // Assert
        var okResult = result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);
        Assert.That(okResult!.Value, Is.Empty);
    }
    
    // Verifies that a matching title returns the exact TODO supplied by the service.
    [Test]
    public void Get_TitleExists_ReturnsOkWithItem()
    {
        // Arrange
        var todo = CreateTodo();
        _serviceMock.Setup(service => service.GetItem(todo.Title)).Returns(todo);

        // Act
        var result = _controller.Get(todo.Title);

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);
        Assert.That(okResult!.Value, Is.SameAs(todo));
        _serviceMock.Verify(service => service.GetItem(todo.Title), Times.Once);
    }

    // Verifies that an unknown title is represented by HTTP 404.
    [Test]
    public void Get_TitleDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        const string title = "Missing item";
        _serviceMock.Setup(service => service.GetItem(title)).Returns((TODOList?)null);

        // Act
        var result = _controller.Get(title);

        // Assert
        Assert.That(result.Result, Is.TypeOf<NotFoundResult>());
    }
    #endregion

    #region Create
    // Verifies that a newly stored TODO is returned through CreatedAtAction.
    [Test]
    public void Create_ValidItem_ReturnsCreatedAtAction()
    {
        // Arrange
        var todo = CreateTodo();
        _serviceMock.Setup(service => service.AddItem(todo)).Returns(todo.Title);

        // Act
        var result = _controller.Create(todo);

        // Assert
        var createdResult = result as CreatedAtActionResult;
        Assert.That(createdResult, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(createdResult!.ActionName, Is.EqualTo(nameof(TODOListController.Get)));
            Assert.That(createdResult.RouteValues!["id"], Is.EqualTo(todo.Title));
            Assert.That(createdResult.Value, Is.SameAs(todo));
        });
        _serviceMock.Verify(service => service.AddItem(todo), Times.Once);
    }

    // Verifies that a full TODO store is translated into an HTTP 400 response.
    [Test]
    public void Create_ServiceRejectsItem_ReturnsBadRequestWithError()
    {
        // Arrange
        var todo = CreateTodo();
        const string error = "Todo List full.";
        _serviceMock
            .Setup(service => service.AddItem(todo))
            .Throws(new InvalidOperationException(error));

        // Act
        var result = _controller.Create(todo);

        // Assert
        Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
        Assert.That(GetResponseProperty(result, "error"), Is.EqualTo(error));
        _serviceMock.Verify(service => service.AddItem(todo), Times.Once);
    }
    #endregion

    #region Put
    // Verifies that PUT delegates every update payload to the service.
    [Test]
    public void Put_TitleExists_DelegatesUpdateToService()
    {
        // Arrange
        const string title = "Buy groceries";
        var updatedTodo = CreateTodo(title, true);
        _serviceMock
            .Setup(service => service.UpdateItem(title, updatedTodo))
            .Returns(updatedTodo);

        // Act
        _controller.Put(title, updatedTodo);

        // Assert
        _serviceMock.Verify(service => service.UpdateItem(title, updatedTodo), Times.Once);
    }

    // Verifies that PUT safely completes when the requested item is missing.
    [Test]
    public void Put_TitleDoesNotExist_DelegatesUpdateToService()
    {
        // Arrange
        const string title = "Missing item";
        var updatedTodo = CreateTodo(title);
        _serviceMock
            .Setup(service => service.UpdateItem(title, updatedTodo))
            .Returns((TODOList?)null);

        // Act
        _controller.Put(title, updatedTodo);

        // Assert
        _serviceMock.Verify(service => service.UpdateItem(title, updatedTodo), Times.Once);
    }
    #endregion

    #region MarkAsCompleted
    // Verifies that an incomplete TODO is toggled before returning HTTP 202.
    [Test]
    public void MarkAsCompleted_ItemIsIncomplete_TogglesAndReturnsAccepted()
    {
        // Arrange
        var todo = CreateTodo();
        var completedTodo = CreateTodo(isCompleted: true);
        _serviceMock.Setup(service => service.GetItem(todo.Title)).Returns(todo);
        _serviceMock.Setup(service => service.ToggleStatus(todo.Title)).Returns(completedTodo);

        // Act
        var result = _controller.MarkAsCompleted(todo.Title);

        // Assert
        var acceptedResult = result as AcceptedResult;
        Assert.That(acceptedResult, Is.Not.Null);
        Assert.That(acceptedResult!.Value, Is.SameAs(completedTodo));
        _serviceMock.Verify(service => service.ToggleStatus(todo.Title), Times.Once);
    }

    // Verifies that marking an already-completed TODO is idempotent.
    [Test]
    public void MarkAsCompleted_ItemIsAlreadyCompleted_ReturnsAcceptedWithoutToggle()
    {
        // Arrange
        var todo = CreateTodo(isCompleted: true);
        _serviceMock.Setup(service => service.GetItem(todo.Title)).Returns(todo);

        // Act
        var result = _controller.MarkAsCompleted(todo.Title);

        // Assert
        var acceptedResult = result as AcceptedResult;
        Assert.That(acceptedResult, Is.Not.Null);
        Assert.That(acceptedResult!.Value, Is.SameAs(todo));
        _serviceMock.Verify(service => service.ToggleStatus(It.IsAny<string>()), Times.Never);
    }

    // Verifies that completing an unknown TODO returns HTTP 404 without toggling state.
    [Test]
    public void MarkAsCompleted_TitleDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        const string title = "Missing item";
        _serviceMock.Setup(service => service.GetItem(title)).Returns((TODOList?)null);

        // Act
        var result = _controller.MarkAsCompleted(title);

        // Assert
        Assert.That(result, Is.TypeOf<NotFoundResult>());
        _serviceMock.Verify(service => service.ToggleStatus(It.IsAny<string>()), Times.Never);
    }
    #endregion

    #region MarkAsInComplete
    // Verifies that a completed TODO is toggled before returning HTTP 202.
    [Test]
    public void MarkAsInComplete_ItemIsCompleted_TogglesAndReturnsAccepted()
    {
        // Arrange
        var todo = CreateTodo(isCompleted: true);
        var incompleteTodo = CreateTodo();
        _serviceMock.Setup(service => service.GetItem(todo.Title)).Returns(todo);
        _serviceMock.Setup(service => service.ToggleStatus(todo.Title)).Returns(incompleteTodo);

        // Act
        var result = _controller.MarkAsInComplete(todo.Title);

        // Assert
        var acceptedResult = result as AcceptedResult;
        Assert.That(acceptedResult, Is.Not.Null);
        Assert.That(acceptedResult!.Value, Is.SameAs(incompleteTodo));
        _serviceMock.Verify(service => service.ToggleStatus(todo.Title), Times.Once);
    }

    // Verifies that marking an already-incomplete TODO is idempotent.
    [Test]
    public void MarkAsInComplete_ItemIsAlreadyIncomplete_ReturnsAcceptedWithoutToggle()
    {
        // Arrange
        var todo = CreateTodo();
        _serviceMock.Setup(service => service.GetItem(todo.Title)).Returns(todo);

        // Act
        var result = _controller.MarkAsInComplete(todo.Title);

        // Assert
        var acceptedResult = result as AcceptedResult;
        Assert.That(acceptedResult, Is.Not.Null);
        Assert.That(acceptedResult!.Value, Is.SameAs(todo));
        _serviceMock.Verify(service => service.ToggleStatus(It.IsAny<string>()), Times.Never);
    }

    // Verifies that incompleting an unknown TODO returns HTTP 404 without toggling state.
    [Test]
    public void MarkAsInComplete_TitleDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        const string title = "Missing item";
        _serviceMock.Setup(service => service.GetItem(title)).Returns((TODOList?)null);

        // Act
        var result = _controller.MarkAsInComplete(title);

        // Assert
        Assert.That(result, Is.TypeOf<NotFoundResult>());
        _serviceMock.Verify(service => service.ToggleStatus(It.IsAny<string>()), Times.Never);
    }
    #endregion

    #region Delete
    // Verifies that deleting an existing TODO returns HTTP 204.
    [Test]
    public void Delete_TitleExists_ReturnsNoContent()
    {
        // Arrange
        const string title = "Buy groceries";
        _serviceMock.Setup(service => service.DeleteItem(title)).Returns(true);

        // Act
        var result = _controller.Delete(title);

        // Assert
        Assert.That(result, Is.TypeOf<NoContentResult>());
        _serviceMock.Verify(service => service.DeleteItem(title), Times.Once);
    }

    // Verifies that deleting an unknown TODO returns HTTP 404.
    [Test]
    public void Delete_TitleDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        const string title = "Missing item";
        _serviceMock.Setup(service => service.DeleteItem(title)).Returns(false);

        // Act
        var result = _controller.Delete(title);

        // Assert
        Assert.That(result, Is.TypeOf<NotFoundResult>());
        _serviceMock.Verify(service => service.DeleteItem(title), Times.Once);
    }
    #endregion

    #region ClearCompleted
    // Verifies that successful cleanup returns the documented confirmation message.
    [Test]
    public void ClearCompleted_ServiceSucceeds_ReturnsOkWithMessage()
    {
        // Arrange
        _serviceMock.Setup(service => service.ClearCompleted()).Returns(true);

        // Act
        var result = _controller.ClearCompleted();

        // Assert
        Assert.That(result, Is.TypeOf<OkObjectResult>());
        Assert.That(
            GetResponseProperty(result, "message"),
            Is.EqualTo("Completed tasks cleared."));
        _serviceMock.Verify(service => service.ClearCompleted(), Times.Once);
    }

    // Verifies that a failed cleanup returns HTTP 400 and its failure message.
    [Test]
    public void ClearCompleted_ServiceFails_ReturnsBadRequestWithMessage()
    {
        // Arrange
        _serviceMock.Setup(service => service.ClearCompleted()).Returns(false);

        // Act
        var result = _controller.ClearCompleted();

        // Assert
        Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
        Assert.That(
            GetResponseProperty(result, "message"),
            Is.EqualTo("Failed to clear completed tasks."));
        _serviceMock.Verify(service => service.ClearCompleted(), Times.Once);
    }
    #endregion
}